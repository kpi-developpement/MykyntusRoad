package com.mykyntus.repository.search;

import com.mykyntus.dto.dossier.ColumnFilter;
import com.mykyntus.dto.dossier.DossierSearchRequest;
import com.mykyntus.dto.dossier.FacetValue;
import com.mykyntus.dto.dossier.SortSpec;
import com.mykyntus.entity.AppField;
import com.mykyntus.entity.Dossier;
import com.mykyntus.entity.DossierFieldValue;
import com.mykyntus.entity.FieldSection;
import com.mykyntus.util.TextUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;

/**
 * Dynamic queries of the dossier table: search with one filter per column, sorting on any column,
 * distinct values of a column (facets) and counters.
 * <p>
 * Every column filter is expressed as {@code dossier.id IN (sub-query)} so it works the same way
 * on imported columns (key/value table) and on application columns.
 */
@Repository
public class DossierSearchRepository {

    private static final char LIKE_ESCAPE = '\\';

    @PersistenceContext
    private EntityManager em;

    // ------------------------------------------------------------------ search

    public Page<Dossier> search(DossierSearchRequest request) {
        int page = request.pageOrDefault();
        int size = request.sizeOrDefault();

        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Dossier> cq = cb.createQuery(Dossier.class);
        Root<Dossier> d = cq.from(Dossier.class);
        cq.select(d).where(predicates(cb, cq, d, request, null));
        cq.orderBy(orders(cb, d, request.sort()));

        List<Dossier> content = em.createQuery(cq)
                .setFirstResult(page * size)
                .setMaxResults(size)
                .getResultList();

        long total = page == 0 && content.size() < size ? content.size() : count(request);
        return new PageImpl<>(content, PageRequest.of(page, size), total);
    }

    public long count(DossierSearchRequest request) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Dossier> d = cq.from(Dossier.class);
        cq.select(cb.count(d)).where(predicates(cb, cq, d, request, null));
        return em.createQuery(cq).getSingleResult();
    }

    // ------------------------------------------------------------------ facets

    public record FacetResult(List<FacetValue> values, long emptyCount, boolean truncated) {
    }

    /** Distinct values of a column with their counts, ignoring the filter of that same column. */
    public FacetResult facets(DossierSearchRequest request, String keyValue, String q, int limit) {
        ColumnKey key = ColumnKey.parse(keyValue);
        String text = TextUtils.trimToNull(q);
        if (key instanceof ColumnKey.FlagsKey) {
            return flagFacets(request, keyValue, text, limit);
        }
        if (key instanceof ColumnKey.StatusKey(FieldSection section)) {
            return statusFacets(request, keyValue, section);
        }
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        List<Predicate> where = new ArrayList<>();
        Expression<?> value;
        Expression<Long> count;
        List<Order> order = new ArrayList<>();

        switch (key) {
            case ColumnKey.DateKey ignored -> {
                Root<Dossier> d = cq.from(Dossier.class);
                where.addAll(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
                value = d.get("dossierDate");
                count = cb.count(d);
                order.add(cb.desc(value));
            }
            case ColumnKey.IdKey ignored -> {
                Root<Dossier> d = cq.from(Dossier.class);
                where.addAll(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
                Expression<String> id = d.get("idExterne");
                if (text != null) {
                    where.add(cb.like(cb.lower(id), likePattern(text), LIKE_ESCAPE));
                }
                value = id;
                count = cb.count(d);
                order.add(cb.asc(id));
            }
            case ColumnKey.RawKey(String column) -> {
                Root<Dossier> d = cq.from(Dossier.class);
                MapJoin<Dossier, String, String> r = d.joinMap("rawData");
                where.addAll(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
                where.add(cb.equal(r.key(), column));
                if (text != null) {
                    where.add(cb.like(cb.lower(r.value()), likePattern(text), LIKE_ESCAPE));
                }
                value = r.value();
                count = cb.count(d);
                order.add(cb.desc(count));
                order.add(cb.asc(r.value()));
            }
            case ColumnKey.AssigneeKey ignored -> {
                Root<Dossier> d = cq.from(Dossier.class);
                where.addAll(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
                Expression<String> assignee = d.get("assignedTo");
                where.add(cb.isNotNull(assignee));
                if (text != null) {
                    where.add(cb.like(cb.lower(assignee), likePattern(text), LIKE_ESCAPE));
                }
                value = assignee;
                count = cb.count(d);
                order.add(cb.desc(count));
                order.add(cb.asc(assignee));
            }
            case ColumnKey.FlagsKey ignored -> throw new IllegalStateException("handled by flagFacets");
            case ColumnKey.StatusKey ignored -> throw new IllegalStateException("handled by statusFacets");
            case ColumnKey.FieldKey(Long fieldId) -> {
                Root<DossierFieldValue> v = cq.from(DossierFieldValue.class);
                Join<DossierFieldValue, Dossier> d = v.join("dossier");
                where.addAll(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
                where.add(cb.equal(v.get("field").get("id"), fieldId));
                Expression<String> fieldValue = v.get("value");
                if (text != null) {
                    where.add(cb.like(cb.lower(fieldValue), likePattern(text), LIKE_ESCAPE));
                }
                value = fieldValue;
                count = cb.count(v);
                order.add(cb.desc(count));
                order.add(cb.asc(fieldValue));
            }
        }

        cq.multiselect(value, count)
                .where(where.toArray(Predicate[]::new))
                .groupBy(value)
                .orderBy(order);

        List<Tuple> rows = em.createQuery(cq).setMaxResults(limit + 1).getResultList();
        List<FacetValue> values = rows.stream()
                .limit(limit)
                .map(t -> new FacetValue(String.valueOf(t.get(0)), t.get(1, Long.class)))
                .toList();
        long empty = text == null ? emptyCount(request, key, keyValue) : 0;
        return new FacetResult(values, empty, rows.size() > limit);
    }

    private long emptyCount(DossierSearchRequest request, ColumnKey key, String keyValue) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Dossier> d = cq.from(Dossier.class);
        List<Predicate> where = new ArrayList<>(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
        switch (key) {
            case ColumnKey.RawKey(String column) ->
                    where.add(cb.not(d.get("id").in(rawIds(cb, cq, column, r -> cb.isNotNull(r.value())))));
            case ColumnKey.FieldKey(Long fieldId) ->
                    where.add(cb.not(d.get("id").in(fieldIds(cb, cq, fieldId, cb::isNotNull))));
            case ColumnKey.FlagsKey ignored -> where.add(noFlags(cb, d));
            case ColumnKey.AssigneeKey ignored -> where.add(cb.isNull(d.get("assignedTo")));
            default -> {
                return 0;
            }
        }
        cq.select(cb.count(d)).where(where.toArray(Predicate[]::new));
        return em.createQuery(cq).getSingleResult();
    }

    // ------------------------------------------------------------------ stats

    /** Per section: number of dossiers with at least one application value filled. */
    public Map<FieldSection, Long> treatedBySection(DossierSearchRequest request) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<DossierFieldValue> v = cq.from(DossierFieldValue.class);
        Join<DossierFieldValue, Dossier> d = v.join("dossier");
        Join<DossierFieldValue, AppField> f = v.join("field");

        List<Predicate> where = new ArrayList<>(Arrays.asList(predicates(cb, cq, d, request, null)));
        where.add(cb.isTrue(f.get("active")));
        Expression<FieldSection> section = f.get("section");
        cq.multiselect(section, cb.countDistinct(d.get("id")))
                .where(where.toArray(Predicate[]::new))
                .groupBy(section);

        Map<FieldSection, Long> result = new EnumMap<>(FieldSection.class);
        for (Tuple t : em.createQuery(cq).getResultList()) {
            result.put(t.get(0, FieldSection.class), t.get(1, Long.class));
        }
        return result;
    }

    // ------------------------------------------------------------------ predicates

    private Predicate[] predicates(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                   DossierSearchRequest request, String excludedKey) {
        List<Predicate> list = new ArrayList<>();
        if (request.date() != null) {
            list.add(cb.equal(d.get("dossierDate"), request.date()));
        }
        String search = TextUtils.trimToNull(request.search());
        if (search != null) {
            list.add(cb.like(cb.lower(d.get("idExterne")), likePattern(search), LIKE_ESCAPE));
        }
        for (ColumnFilter filter : request.filtersOrEmpty()) {
            if (filter == null || filter.key() == null || filter.key().equals(excludedKey)) {
                continue;
            }
            Predicate p = columnPredicate(cb, query, d, ColumnKey.parse(filter.key()), filter);
            if (p != null) {
                list.add(p);
            }
        }
        return list.toArray(Predicate[]::new);
    }

    private Predicate columnPredicate(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                      ColumnKey key, ColumnFilter filter) {
        List<String> values = filter.values() == null ? List.of() : filter.values();
        boolean includeEmpty = values.stream().anyMatch(v -> v == null || v.isBlank());
        List<String> nonEmpty = values.stream().filter(v -> v != null && !v.isBlank()).distinct().toList();
        String text = TextUtils.trimToNull(filter.text());
        FilterOp op = FilterOp.parse(filter.op());
        if (filter.op() == null && text == null && (filter.from() != null || filter.to() != null)) {
            op = FilterOp.BETWEEN;
        }

        List<Predicate> parts = new ArrayList<>();
        if (includeEmpty || !nonEmpty.isEmpty()) {
            parts.add(valuesPredicate(cb, query, d, key, nonEmpty, includeEmpty));
        }
        boolean hasCondition = op.needsText() ? text != null
                : op != FilterOp.BETWEEN || TextUtils.trimToNull(filter.from()) != null || TextUtils.trimToNull(filter.to()) != null;
        if (hasCondition && !(key instanceof ColumnKey.StatusKey)) {
            Predicate p = conditionPredicate(cb, query, d, key, op, text, parseDate(filter.from()), parseDate(filter.to()));
            if (p != null) {
                parts.add(p);
            }
        }
        return parts.isEmpty() ? null : cb.and(parts.toArray(Predicate[]::new));
    }

    private Predicate valuesPredicate(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                      ColumnKey key, List<String> values, boolean includeEmpty) {
        Path<Long> id = d.get("id");
        return switch (key) {
            case ColumnKey.DateKey ignored -> {
                List<LocalDate> dates = parseDates(values);
                yield dates.isEmpty() ? cb.disjunction() : d.get("dossierDate").in(dates);
            }
            case ColumnKey.IdKey ignored -> values.isEmpty() ? cb.disjunction() : d.get("idExterne").in(values);
            case ColumnKey.StatusKey(FieldSection section) -> {
                List<Predicate> or = new ArrayList<>();
                for (String v : values) {
                    or.add(statusPredicate(cb, query, d, section, v));
                }
                yield cb.or(or.toArray(Predicate[]::new));
            }
            case ColumnKey.FlagsKey ignored -> {
                List<Predicate> or = new ArrayList<>();
                Expression<String> flags = d.get("flags");
                for (String code : values) {
                    or.add(cb.like(flags, "%|" + escapeLike(code) + "|%", LIKE_ESCAPE));
                }
                if (includeEmpty) {
                    or.add(noFlags(cb, d));
                }
                yield cb.or(or.toArray(Predicate[]::new));
            }
            case ColumnKey.AssigneeKey ignored -> {
                List<Predicate> or = new ArrayList<>();
                if (!values.isEmpty()) {
                    or.add(d.get("assignedTo").in(values));
                }
                if (includeEmpty) {
                    or.add(cb.isNull(d.get("assignedTo")));
                }
                yield cb.or(or.toArray(Predicate[]::new));
            }
            case ColumnKey.RawKey(String column) -> {
                List<Predicate> or = new ArrayList<>();
                if (!values.isEmpty()) {
                    or.add(id.in(rawIds(cb, query, column, r -> r.value().in(values))));
                }
                if (includeEmpty) {
                    or.add(cb.not(id.in(rawIds(cb, query, column, r -> cb.isNotNull(r.value())))));
                }
                yield cb.or(or.toArray(Predicate[]::new));
            }
            case ColumnKey.FieldKey(Long fieldId) -> {
                List<Predicate> or = new ArrayList<>();
                if (!values.isEmpty()) {
                    or.add(id.in(fieldIds(cb, query, fieldId, v -> v.in(values))));
                }
                if (includeEmpty) {
                    or.add(cb.not(id.in(fieldIds(cb, query, fieldId, cb::isNotNull))));
                }
                yield cb.or(or.toArray(Predicate[]::new));
            }
        };
    }

    /**
     * Condition filter (contains, does not contain, equals, starts with, empty, date range...).
     * Negative conditions are "NOT (positive)" so the dossiers without value match them.
     */
    private Predicate conditionPredicate(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                         ColumnKey key, FilterOp op, String text, LocalDate from, LocalDate to) {
        FilterOp positive = op.positive();
        Path<Long> id = d.get("id");
        Predicate p = switch (key) {
            case ColumnKey.DateKey ignored -> {
                Expression<LocalDate> date = d.get("dossierDate");
                if (positive == FilterOp.BETWEEN || positive == FilterOp.EQUALS) {
                    LocalDate f = positive == FilterOp.EQUALS ? parseDate(text) : from;
                    LocalDate t = positive == FilterOp.EQUALS ? f : to;
                    List<Predicate> and = new ArrayList<>();
                    if (f != null) and.add(cb.greaterThanOrEqualTo(date, f));
                    if (t != null) and.add(cb.lessThanOrEqualTo(date, t));
                    yield and.isEmpty() ? null : cb.and(and.toArray(Predicate[]::new));
                }
                yield null;
            }
            case ColumnKey.IdKey ignored -> direct(cb, d.get("idExterne"), positive, text, from, to, false);
            case ColumnKey.FlagsKey ignored -> direct(cb, d.get("flags"), positive, text, from, to, false);
            case ColumnKey.AssigneeKey ignored -> direct(cb, d.get("assignedTo"), positive, text, from, to, false);
            case ColumnKey.StatusKey ignored -> null;
            case ColumnKey.RawKey(String column) ->
                    id.in(rawIds(cb, query, column, r -> textCondition(cb, r.value(), positive, text, from, to, true)));
            case ColumnKey.FieldKey(Long fieldId) ->
                    id.in(fieldIds(cb, query, fieldId, v -> textCondition(cb, v, positive, text, from, to, false)));
        };
        if (p == null) {
            return null;
        }
        if (!op.negative()) {
            return p;
        }
        // values stored on the dossier itself: an empty value also matches a negative condition
        return switch (key) {
            case ColumnKey.IdKey ignored -> cb.not(p);
            case ColumnKey.FlagsKey ignored -> cb.or(noFlags(cb, d), cb.not(p));
            case ColumnKey.AssigneeKey ignored -> cb.or(cb.isNull(d.get("assignedTo")), cb.not(p));
            default -> cb.not(p);
        };
    }

    private Predicate direct(CriteriaBuilder cb, Expression<String> value, FilterOp op, String text,
                             LocalDate from, LocalDate to, boolean frenchDates) {
        return textCondition(cb, value, op, text, from, to, frenchDates);
    }

    /**
     * Positive condition on a text value.
     *
     * @param frenchDates imported values are written "dd/MM/yyyy [HH:mm]": a date range compares them
     *                    rewritten as yyyy-MM-dd (application DATE values are already ISO)
     */
    private Predicate textCondition(CriteriaBuilder cb, Expression<String> value, FilterOp op, String text,
                                    LocalDate from, LocalDate to, boolean frenchDates) {
        Expression<String> lower = cb.lower(value);
        String t = text == null ? "" : text.toLowerCase(Locale.ROOT);
        return switch (op) {
            case CONTAINS -> cb.like(lower, "%" + escapeLike(t) + "%", LIKE_ESCAPE);
            case EQUALS -> cb.equal(cb.trim(lower), t.trim());
            case STARTS_WITH -> cb.like(lower, escapeLike(t) + "%", LIKE_ESCAPE);
            case ENDS_WITH -> cb.like(lower, "%" + escapeLike(t), LIKE_ESCAPE);
            case NOT_EMPTY -> cb.and(cb.isNotNull(value), cb.notEqual(cb.trim(value), ""));
            case BETWEEN -> {
                Expression<String> iso = value;
                List<Predicate> and = new ArrayList<>();
                if (frenchDates) {
                    // "20/11/2026 16:00" -> "2026-11-20"
                    and.add(cb.like(value, "__/__/____%"));
                    iso = cb.concat(cb.concat(cb.concat(cb.concat(cb.substring(value, 7, 4), "-"), cb.substring(value, 4, 2)), "-"),
                            cb.substring(value, 1, 2));
                } else {
                    iso = cb.substring(value, 1, 10);
                    and.add(cb.like(value, "____-__-__%"));
                }
                if (from != null) and.add(cb.greaterThanOrEqualTo(iso, from.toString()));
                if (to != null) and.add(cb.lessThanOrEqualTo(iso, to.toString()));
                yield cb.and(and.toArray(Predicate[]::new));
            }
            default -> throw new IllegalStateException("negative condition " + op);
        };
    }

    // ------------------------------------------------------------------ progress (status)

    /** UNTOUCHED / IN_PROGRESS / DONE of a section. */
    private Predicate statusPredicate(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                      FieldSection section, String status) {
        Path<Long> id = d.get("id");
        return switch (status == null ? "" : status.toUpperCase(Locale.ROOT)) {
            case "UNTOUCHED" -> cb.not(id.in(touchedIds(cb, query, section)));
            case "IN_PROGRESS" -> cb.and(id.in(touchedIds(cb, query, section)), cb.not(id.in(doneIds(cb, query, section))));
            case "DONE" -> id.in(doneIds(cb, query, section));
            default -> throw com.mykyntus.exception.ApiException.badRequest("Statut inconnu : " + status);
        };
    }

    /** Dossiers with at least one value in the section. */
    private Subquery<Long> touchedIds(CriteriaBuilder cb, CommonAbstractCriteria query, FieldSection section) {
        Subquery<Long> sq = query.subquery(Long.class);
        Root<DossierFieldValue> v = sq.from(DossierFieldValue.class);
        Join<DossierFieldValue, AppField> f = v.join("field");
        sq.select(v.get("dossier").get("id")).where(
                cb.equal(f.get("section"), section), cb.isTrue(f.get("active")),
                cb.isNotNull(v.get("value")), cb.notEqual(v.get("value"), ""));
        return sq;
    }

    /** Dossiers whose required fields of the section are all filled (see {@link #requiredFields}). */
    private Subquery<Long> doneIds(CriteriaBuilder cb, CommonAbstractCriteria query, FieldSection section) {
        List<Long> required = requiredFields(section);
        Subquery<Long> sq = query.subquery(Long.class);
        Root<DossierFieldValue> v = sq.from(DossierFieldValue.class);
        if (required.isEmpty()) {
            // nothing to fill: never "done"
            sq.select(v.get("dossier").get("id")).where(cb.disjunction());
            return sq;
        }
        Expression<Long> dossierId = v.get("dossier").get("id");
        sq.select(dossierId)
                .where(v.get("field").get("id").in(required), cb.isNotNull(v.get("value")), cb.notEqual(v.get("value"), ""))
                .groupBy(dossierId)
                .having(cb.equal(cb.countDistinct(v.get("field").get("id")), (long) required.size()));
        return sq;
    }

    /**
     * Fields that must be filled for a section to be "done": its final field when it has one
     * (published, e.g. "Etat final" for Sécurisation), otherwise all its dropdown lists.
     * Free text, automatic date and pilot are never required.
     */
    public List<Long> requiredFields(FieldSection section) {
        List<AppField> fields = em.createQuery("select f from AppField f where f.active = true and f.section = :s", AppField.class)
                .setParameter("s", section).getResultList();
        List<Long> published = fields.stream().filter(AppField::isPublished).map(AppField::getId).toList();
        if (!published.isEmpty()) {
            return published;
        }
        return fields.stream().filter(f -> f.getType() == com.mykyntus.entity.FieldType.SELECT).map(AppField::getId).toList();
    }

    /** Ids of the active fields of a section (any value = "touched"). */
    public List<Long> activeFields(FieldSection section) {
        return em.createQuery("select f.id from AppField f where f.active = true and f.section = :s", Long.class)
                .setParameter("s", section).getResultList();
    }

    private FacetResult statusFacets(DossierSearchRequest request, String keyValue, FieldSection section) {
        List<FacetValue> values = new ArrayList<>();
        for (String status : List.of("UNTOUCHED", "IN_PROGRESS", "DONE")) {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<Dossier> d = cq.from(Dossier.class);
            List<Predicate> where = new ArrayList<>(Arrays.asList(predicates(cb, cq, d, request, keyValue)));
            where.add(statusPredicate(cb, cq, d, section, status));
            cq.select(cb.count(d)).where(where.toArray(Predicate[]::new));
            values.add(new FacetValue(status, em.createQuery(cq).getSingleResult()));
        }
        return new FacetResult(values, 0, false);
    }

    /** Per section: dossiers "done" (every required field filled). */
    public Map<FieldSection, Long> doneBySection(DossierSearchRequest request) {
        Map<FieldSection, Long> result = new EnumMap<>(FieldSection.class);
        for (FieldSection section : FieldSection.values()) {
            CriteriaBuilder cb = em.getCriteriaBuilder();
            CriteriaQuery<Long> cq = cb.createQuery(Long.class);
            Root<Dossier> d = cq.from(Dossier.class);
            List<Predicate> where = new ArrayList<>(Arrays.asList(predicates(cb, cq, d, request, null)));
            where.add(d.get("id").in(doneIds(cb, cq, section)));
            cq.select(cb.count(d)).where(where.toArray(Predicate[]::new));
            result.put(section, em.createQuery(cq).getSingleResult());
        }
        return result;
    }

    /** {@code select d.id from Dossier d join d.rawData r where key(r) = :column and <condition>}. */
    private Subquery<Long> rawIds(CriteriaBuilder cb, CommonAbstractCriteria query, String column,
                                  Function<MapJoin<Dossier, String, String>, Predicate> condition) {
        Subquery<Long> sq = query.subquery(Long.class);
        Root<Dossier> d2 = sq.from(Dossier.class);
        MapJoin<Dossier, String, String> r = d2.joinMap("rawData");
        sq.select(d2.get("id")).where(cb.equal(r.key(), column), condition.apply(r));
        return sq;
    }

    /** {@code select v.dossier.id from DossierFieldValue v where v.field.id = :fieldId and <condition>}. */
    private Subquery<Long> fieldIds(CriteriaBuilder cb, CommonAbstractCriteria query, Long fieldId,
                                    Function<Expression<String>, Predicate> condition) {
        Subquery<Long> sq = query.subquery(Long.class);
        Root<DossierFieldValue> v = sq.from(DossierFieldValue.class);
        sq.select(v.get("dossier").get("id"))
                .where(cb.equal(v.get("field").get("id"), fieldId), condition.apply(v.get("value")));
        return sq;
    }

    // ------------------------------------------------------------------ sorting

    private List<Order> orders(CriteriaBuilder cb, Root<Dossier> d, SortSpec sort) {
        List<Order> orders = new ArrayList<>();
        if (sort != null && sort.key() != null && !sort.key().isBlank()) {
            Expression<?> expression = switch (ColumnKey.parse(sort.key())) {
                case ColumnKey.DateKey ignored -> d.get("dossierDate");
                case ColumnKey.IdKey ignored -> d.get("idExterne");
                case ColumnKey.FlagsKey ignored -> d.get("flags");
                case ColumnKey.AssigneeKey ignored -> d.get("assignedTo");
                case ColumnKey.StatusKey ignored -> throw com.mykyntus.exception.ApiException.badRequest("Tri impossible sur l'avancement");
                case ColumnKey.RawKey(String column) -> {
                    MapJoin<Dossier, String, String> r = d.joinMap("rawData", JoinType.LEFT);
                    r.on(cb.equal(r.key(), column));
                    yield r.value();
                }
                case ColumnKey.FieldKey(Long fieldId) -> {
                    Join<Dossier, DossierFieldValue> v = d.join("fieldValues", JoinType.LEFT);
                    v.on(cb.equal(v.get("field").get("id"), fieldId));
                    yield v.get("value");
                }
            };
            // empty values always at the bottom
            orders.add(sort.descending() ? cb.desc(expression, Nulls.LAST) : cb.asc(expression, Nulls.LAST));
        }
        orders.add(cb.asc(d.get("dossierDate")));
        orders.add(cb.asc(d.get("idExterne")));
        return orders;
    }

    // ------------------------------------------------------------------ flags / dispatch / export

    /** Flags are stored "|P1|SECU|": counts every code of the matching dossiers. */
    private FacetResult flagFacets(DossierSearchRequest request, String keyValue, String text, int limit) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<Dossier> d = cq.from(Dossier.class);
        Expression<String> flags = d.get("flags");
        cq.multiselect(flags, cb.count(d))
                .where(predicates(cb, cq, d, request, keyValue))
                .groupBy(flags);
        Map<String, Long> counts = new LinkedHashMap<>();
        long empty = 0;
        for (Tuple t : em.createQuery(cq).getResultList()) {
            String value = t.get(0, String.class);
            long n = t.get(1, Long.class);
            boolean any = false;
            for (String code : value == null ? new String[0] : value.split("\\|")) {
                if (!code.isBlank()) {
                    counts.merge(code, n, Long::sum);
                    any = true;
                }
            }
            if (!any) {
                empty += n;
            }
        }
        String lower = text == null ? null : text.toLowerCase(Locale.ROOT);
        List<FacetValue> values = counts.entrySet().stream()
                .filter(e -> lower == null || e.getKey().toLowerCase(Locale.ROOT).contains(lower))
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .map(e -> new FacetValue(e.getKey(), e.getValue()))
                .toList();
        return new FacetResult(values.stream().limit(limit).toList(), text == null ? empty : 0, values.size() > limit);
    }

    private static Predicate noFlags(CriteriaBuilder cb, From<?, Dossier> d) {
        return cb.or(cb.isNull(d.get("flags")), cb.equal(d.get("flags"), ""));
    }

    /** One line per matching dossier: id, assigned pilot, flags, treated (state filled). */
    public record ScopeRow(Long id, String assignedTo, String flags, boolean treated) {
    }

    /**
     * Every dossier matching the criteria (no paging), with what the dispatch needs.
     *
     * @param treatedFieldId field whose value marks a dossier as treated (null = any sécurisation value)
     */
    public List<ScopeRow> scope(DossierSearchRequest request, Long treatedFieldId) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Tuple> cq = cb.createTupleQuery();
        Root<Dossier> d = cq.from(Dossier.class);

        Subquery<Long> treated = cq.subquery(Long.class);
        Root<DossierFieldValue> v = treated.from(DossierFieldValue.class);
        Predicate filled = cb.and(cb.isNotNull(v.get("value")), cb.notEqual(v.get("value"), ""));
        Predicate field = treatedFieldId != null
                ? cb.equal(v.get("field").get("id"), treatedFieldId)
                : cb.equal(v.get("field").get("section"), FieldSection.SECURISATION);
        treated.select(v.get("dossier").get("id")).where(field, filled);

        cq.multiselect(d.get("id"), d.get("assignedTo"), d.get("flags"),
                        cb.selectCase().when(d.get("id").in(treated), true).otherwise(false))
                .where(predicates(cb, cq, d, request, null))
                .orderBy(cb.asc(d.get("dossierDate")), cb.asc(d.get("idExterne")));
        return em.createQuery(cq).getResultList().stream()
                .map(t -> new ScopeRow(t.get(0, Long.class), t.get(1, String.class), t.get(2, String.class),
                        Boolean.TRUE.equals(t.get(3))))
                .toList();
    }

    /** Ids of every matching dossier, in the table order (export). */
    public List<Long> ids(DossierSearchRequest request, int max) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<Dossier> d = cq.from(Dossier.class);
        cq.select(d.get("id")).where(predicates(cb, cq, d, request, null));
        cq.orderBy(orders(cb, d, request.sort()));
        return em.createQuery(cq).setMaxResults(max).getResultList();
    }

    // ------------------------------------------------------------------ helpers

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static String likePattern(String text) {
        String escaped = text.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }

    private static LocalDate parseDate(String value) {
        String v = TextUtils.trimToNull(value);
        if (v == null) {
            return null;
        }
        try {
            return LocalDate.parse(v.length() > 10 ? v.substring(0, 10) : v);
        } catch (DateTimeParseException e) {
            throw com.mykyntus.exception.ApiException.badRequest("Date invalide : " + value);
        }
    }

    private static List<LocalDate> parseDates(List<String> values) {
        List<LocalDate> dates = new ArrayList<>();
        for (String v : values) {
            try {
                dates.add(LocalDate.parse(v.trim()));
            } catch (DateTimeParseException ignored) {
                // invalid date: ignored
            }
        }
        return dates;
    }
}
