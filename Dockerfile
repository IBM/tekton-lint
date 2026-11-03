#
# SPDX-License-Identifier: Apache-2.0
#
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

COPY . /usr/src/app
RUN npm ci && npm run build

FROM node:22-alpine AS production

RUN apk add --no-cache tini git

WORKDIR /usr/src/app
COPY --chown=node:node --from=builder /usr/src/app/package*.json ./
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist
RUN npm ci --omit=dev

USER node
ENV NODE_ENV=production

ENTRYPOINT [ "tini", "--", "node", "dist/lint.js" ]