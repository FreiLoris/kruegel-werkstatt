# ── Stufe 1: Bauen ────────────────────────────────────────────────
# Volles JDK + Maven Wrapper. Diese Stufe landet NICHT im fertigen Image.
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app

# Zuerst nur die Build-Dateien kopieren: Solange sich pom.xml nicht ändert,
# verwendet Docker den Cache und lädt die Abhängigkeiten nicht neu herunter.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q dependency:go-offline

COPY src/ src/
# Tests laufen nicht hier, sondern vorher lokal bzw. in der CI
# (Testcontainers braucht Docker – das gibt es innerhalb eines Docker-Builds nicht).
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q package -DskipTests \
 && cp target/werkstatt-*.jar app.jar

# ── Stufe 2: Ausführen ────────────────────────────────────────────
# Nur die Java-Laufzeit (JRE) – deutlich kleiner als das JDK.
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Nicht als root laufen.
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
