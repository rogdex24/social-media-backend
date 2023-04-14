# social-media-backend

**Tech Stack**: *Node.js, MongoDB*

- Developed a RESTful API for a social media platform with features such as user authentication (JWT token), following and unfollowing users, posting, deleting posts, liking/unliking posts, and commenting on posts.
- Ensured data integrity by implementing ACID transactions on MongoDB during post creation, deletion, and updates.
- Used Mocha and Chai.js to write API tests for code quality and reliability.
- Containerized the application using Docker for easy deployment and scalability.


## API Endpoints

API hosted on https://social-media-backend-zy6o.onrender.com/ 

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/23153797-e442973d-d3e7-48f1-8cbe-cb2fee0b1f7b?action=collection%2Ffork&collection-url=entityId%3D23153797-e442973d-d3e7-48f1-8cbe-cb2fee0b1f7b%26entityType%3Dcollection%26workspaceId%3D6a2e7cfa-b21d-4b0c-b9e7-388fd99d4e25)
## Steps to run project Locally

Instal Dependencies
```bash
npm install
````
-> Create a `.env` file with contents of sample-env.txt and change the environment variables accordingly

Start the server

```bash
npm start
```

Run the tests for API endpoints
```bash
npm test
```

## Steps to run the project on docker

To run the server and database, server would be available on `http://localhost:5000`
```bash
docker compose up -d
```

To stop the server and database
```bash
docker compose down
```

To run the tests for API endpoints in the docker container
```bash
docker compose run --rm nodejs_api npm test
```
