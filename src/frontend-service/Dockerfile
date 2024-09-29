FROM node:lts-alpine AS build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
RUN ls -al .next

FROM node:lts-alpine AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/.next ./next
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/package-lock.json ./package-lock.json
RUN npm install --omit=dev
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]