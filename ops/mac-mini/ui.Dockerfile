# Build the browser bundle locally with yarn build:browser, then stage build/
# beside this file. Keep the proven sync server and replace only its web bundle.
FROM actualbudget/actual-server@sha256:24645e971da6bb1a1f953d6859e307a0b29be1e8b4130a35b3220c209b5b860c
ARG UI_REVISION
LABEL org.opencontainers.image.title="Actual Household UI" \
      org.opencontainers.image.revision=$UI_REVISION
RUN rm -rf /app/node_modules/@actual-app/web/build
COPY build/ /app/node_modules/@actual-app/web/build/
