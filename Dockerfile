FROM node:14-alpine

WORKDIR /app
COPY . /app/

RUN npm install --production

CMD ["npm", "run", "serve"]
