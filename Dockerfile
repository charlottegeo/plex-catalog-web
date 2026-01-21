FROM docker.io/node:22 as node
RUN npm i -g pnpm
WORKDIR /app/

ARG VITE_API_URL
ARG VITE_SSO_CLIENT_ID
ARG VITE_SSO_AUTHORITY
ARG VITE_SSO_ENABLED

COPY package.json pnpm-lock.yaml /app/
RUN pnpm i --frozen-lockfile

COPY . /app/
RUN pnpm run build

FROM docker.io/nginxinc/nginx-unprivileged:alpine

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=node /app/dist /usr/share/nginx/html

EXPOSE 8080