# ---------- build ----------
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# dependencies first (cached as long as pom.xml does not change)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN sh ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN sh ./mvnw -B -q package -DskipTests && cp target/*.jar app.jar

# ---------- run ----------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/app.jar app.jar
USER app

ENV SERVER_PORT=8334 \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -Duser.timezone=Europe/Paris"
EXPOSE 8334

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
