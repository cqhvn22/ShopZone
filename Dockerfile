# syntax=docker/dockerfile:1
FROM maven:3.9.11-eclipse-temurin-17 AS build
WORKDIR /src
COPY . .
ARG MODULE
RUN --mount=type=cache,target=/root/.m2 mvn -B -pl ${MODULE} -am package -DskipTests
RUN cp ${MODULE}/target/${MODULE}-1.0.0-SNAPSHOT.jar /app.jar
FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* && useradd -r -u 10001 shopzone
WORKDIR /app
COPY --from=build /app.jar app.jar
USER 10001
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java","-jar","/app/app.jar"]
