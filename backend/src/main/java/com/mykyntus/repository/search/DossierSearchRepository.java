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

        List<Predicate> parts = new ArrayList<>();
        if (includeEmpty || !nonEmpty.isEmpty()) {
            parts.add(valuesPredicate(cb, query, d, key, nonEmpty, includeEmpty));
        }
        if (text != null) {
            Predicate p = textPredicate(cb, query, d, key, text);
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

    private Predicate textPredicate(CriteriaBuilder cb, CommonAbstractCriteria query, From<?, Dossier> d,
                                    ColumnKey key, String text) {
        String pattern = likePattern(text);
        Path<Long> id = d.get("id");
        return switch (key) {
            case ColumnKey.DateKey ignored -> null;
            case ColumnKey.IdKey ignored -> cb.like(cb.lower(d.get("idExterne")), pattern, LIKE_ESCAPE);
            case ColumnKey.FlagsKey ignored -> cb.like(cb.lower(d.get("flags")), pattern, LIKE_ESCAPE);
            case ColumnKey.AssigneeKey ignored -> cb.like(cb.lower(d.get("assignedTo")), pattern, LIKE_ESCAPE);
            case ColumnKey.RawKey(String column) ->
                    id.in(rawIds(cb, query, column, r -> cb.like(cb.lower(r.value()), pattern, LIKE_ESCAPE)));
            case ColumnKey.FieldKey(Long fieldId) ->
                    id.in(fieldIds(cb, query, fieldId, v -> cb.like(cb.lower(v), pattern, LIKE_ESCAPE)));
        };
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
