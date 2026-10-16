FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

RUN npm install -g npm@latest

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN rm -rf node_modules package-lock.json \
    && npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 80
CMD [ "node", "index.js" ]
