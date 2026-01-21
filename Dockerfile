FROM docker.io/node:22 as node
RUN npm i -g pnpm
WORKDIR /app/
COPY package.json pnpm-lock.yaml /app/
RUN pnpm i
COPY . /app/
RUN pnpm run build

FROM docker.io/nginxinc/nginx-unprivileged:alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=node /app/dist /usr/share/nginx/html
EXPOSE 8080