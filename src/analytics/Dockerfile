# Build stage
FROM eclipse-temurin:11-jdk AS build

WORKDIR /workspace

COPY . .

RUN ./gradlew --no-daemon :app:shadowJar

# Runtime stage
FROM eclipse-temurin:11-jre

WORKDIR /app

COPY --from=build /workspace/app/build/libs/*-fat.jar /app/app.jar

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
