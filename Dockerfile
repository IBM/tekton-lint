#
# SPDX-License-Identifier: Apache-2.0
#
FROM node:18 AS builder

WORKDIR /usr/src/app

# Copy node.js source and build, changing owner as well
COPY --chown=node:node . /usr/src/app
RUN npm ci && npm run build && npm shrinkwrap

FROM node:16 AS production

# Setup tini to work better handle signals
ENV TINI_VERSION v0.19.0
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini

WORKDIR /usr/src/app
COPY --chown=node:node --from=builder /usr/src/app/lib ./lib
COPY --chown=node:node --from=builder /usr/src/app/package.json ./
COPY --chown=node:node --from=builder /usr/src/app/npm-shrinkwrap.json ./

USER node
ENV NODE_ENV=production
WORKDIR /usr/src/app
# ENTRYPOINT [ "/tini", "--", "node","lib/main.js" ]
ENTRYPOINT [ "node","lib/main.js" ]