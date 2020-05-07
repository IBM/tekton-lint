FROM node:12.16.3-alpine
WORKDIR /src
COPY . /src
RUN npm ci --prod
ENTRYPOINT ["node", "lint.js"]
