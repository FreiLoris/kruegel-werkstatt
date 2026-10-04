# ── Stage 1: build ────────────────────────────────────────────────
# Full JDK + Maven wrapper. This stage does NOT end up in the final image.
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app

# Copy only the build files first: as long as pom.xml does not change,
# Docker uses the cache and does not download the dependencies again.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q dependency:go-offline

COPY src/ src/
# Tests do not run here but before, locally or in CI
# (Testcontainers needs Docker – which is not available inside a Docker build).
RUN --mount=type=cache,target=/root/.m2 ./mvnw -q package -DskipTests \
 && cp target/werkstatt-*.jar app.jar

# ── Stage 2: run ──────────────────────────────────────────────────
# Only the Java runtime (JRE) – much smaller than the JDK.
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Do not run as root.
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=build /app/app.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
