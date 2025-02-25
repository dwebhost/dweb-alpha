# DWeb (Deploy decentralized websites)

## Description
With DWeb you can deploy your website in a decentralized way, using IPFS and ENS. This project like a vercel but for decentralized websites.
Just connect your wallet, and drop your github repository link. DWeb will deploy your website in IPFS and register the hash in ENS.

## Project structure
- **dweb-be**: Backend service that will clone the repository, build the website and deploy it in IPFS.
- **dweb-fe**: Frontend service that will interact with the backend service, ENS and the user.

## How to run the project
1. Clone the repository
2. Install the dependencies
3. Run docker-compose up

## Configuration
Create a .env file in the root of each service: dweb-be and dweb-fe. You can use the .env.example file as a template.