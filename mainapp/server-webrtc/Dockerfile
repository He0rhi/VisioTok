FROM node

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . /app

EXPOSE 3002

CMD [ "node", "server.js" ]