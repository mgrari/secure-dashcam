## Prerequisites

Before running this project, ensure the following requirements are met:

1. **Docker**: Installed on your machine.
   - Install instructions: [Get Docker](https://docs.docker.com/get-docker/)
   
2. **Docker Daemon**: Running on your machine.
   - Start Docker (if required):
    ```bash
    sudo systemctl start docker
    ```

3. **Docker Compose**: Version 2.20.2 or higher is required.
   - If the script detects Docker Compose is missing, it will install it automatically.


## How to Run


# Automatic installation
To start the project, follow these steps:

1. Clone the repository and navigate to the project directory:
    ```bash
    git clone https://gitlab.com/MyTricker/dashcamssd
    cd dashcamssd
    ```


##### Important Note : Ensure that no other instance of MongoDB (mongod) is already running on your machine.
If another MongoDB instance is active, Docker may encounter conflicts.
You can check if MongoDB is running with the following command:

```bash
sudo systemctl status mongod
```
if it is running, do :

```bash
sudo systemctl stop mongod
```


1. Run the provided script to have all services automatically up and running using Docker Compose:
    ```bash
    sudo ./run_docker.sh
    ```

2. Wait for the containers to start. Once the setup is complete, the services will be accessible:
- Frontend: https://localhost:3000
- Backend: https://localhost:8080


## Optional: Clean Docker Cache

To clean up unused Docker images and volumes, uncomment the following lines in run_docker.sh:
```bash
# docker system prune -f
# docker volume prune -f
```


## Logs and monitoring

To check the status of running containers:
```bash
docker ps
```

To view the logs of a specific container:
```bash
docker logs <container_name>
```
Example:
```bash
docker logs nodeBackend
```







# Manual Installation

To run the entire project, you will need **two separate terminals**:

## Installation of MongoDb
[Click here](https://www.google.com/search?q=how+to+install+mongodb+&client=firefox-b-d&sca_esv=a4c5c968ead58a07&sxsrf=ADLYWIKBwpWDFZ-_2h6BHKtyumTMkJqG0Q%3A1737312905336&ei=iUqNZ6iIFLni7_UP16fH4AI&ved=0ahUKEwjo8Nf0uoKLAxU58bsIHdfTESwQ4dUDCBA&uact=5&oq=how+to+install+mongodb+&gs_lp=Egxnd3Mtd2l6LXNlcnAiF2hvdyB0byBpbnN0YWxsIG1vbmdvZGIgMggQABiABBjLATIIEAAYgAQYywEyCBAAGIAEGMsBMggQABiABBjLATIIEAAYgAQYywEyCBAAGIAEGMsBMggQABiABBjLATIIEAAYgAQYywEyCBAAGIAEGMsBMggQABiABBjLAUirJVC1AVixInACeACQAQCYAVGgAfkEqgEBObgBA8gBAPgBAZgCCqAC1wTCAgoQABiwAxjWBBhHwgINEAAYgAQYsAMYQxiKBcICBxAAGIAEGA3CAgYQABgNGB7CAgkQABiABBgTGA3CAggQABgTGA0YHsICChAAGBMYChgNGB7CAgoQABgTGBYYChgewgIIEAAYExgWGB6YAwDiAwUSATEgQIgGAZAGCpIHAjEwoAesVA&sclient=gws-wiz-serp)


you also have to run the `setUpAdminMongo.sh` to create admin user so that the database is even more secure 
```bash
sudo ./setUpAdminMongo.sh
``` 

## Terminal 1 (Frontend):

```bash
cd nextfrontend
npm install
npm run dev
```
The frontend (Next.js) will run by default on port 3000 (https://localhost:3000).

## Terminal 2 (Backend):



```bash
cd nodeBackend
npm install
npm run dev

```

### INFO
The Node.js backend will run by default on port 8080 (https://localhost:8080).

Requests made by the frontend to the server should point to port 8080.

### !!!
The `npm run dev` command uses `nodemon` in the background. This automatically restarts the server whenever you save a file (`ctrl+s`), which is a huge time saver.

---

# How Do Routes Work in Next.js?

In Next.js (version 13+ with the `app/` directory), pages and routes are generally created based on the directory and file structure:

- **`app/page.tsx`**: The root page.
- **`app/testpageexample/page.tsx`**: A page accessible at `/testpageexample`.

If you do not need to modify the frontend, leave these files as is.  
The key takeaway is that Next.js manages pages through the folder structure, without requiring explicit routing configuration. You can add a new page simply by creating a new folder and an associated `page.tsx` file.

---

# Ports

- **Frontend (Next.js)**: https://localhost:3000  
- **Backend (Node.js)**: https://localhost:8080  

All server requests (using `fetch`, `axios`, etc.) will be made on port `8080`.

---

# Frontend & Backend

- **Frontend (Next.js)**:  
  The `nextfrontend` folder contains the frontend code. Next.js is a React framework that enables building web applications with server-side rendering, simplified routing, and advanced features integration (SSR, SSG, etc.).

- **Backend (Node.js)**:  
  The `nodeBackend` folder contains the backend code in Node.js (e.g., `server.js`). It is a classic Node.js server, potentially using Express or another HTTP framework, handling server-side API requests.

---

# Advantages of Next.js

Next.js offers numerous advantages, including:

- **Server-Side Rendering (SSR)**: Enables faster loading and better SEO (search engine indexing).
- **Simplified Routing System**: File-based routing makes creating new pages straightforward.
- **TypeScript Integration**: Easily supports TypeScript, making code more maintainable and robust.
- **Hot Reloading**: The server automatically updates when you modify files, accelerating development.

---

# Conclusion

- Use **two terminals**: one for the frontend (Next.js, port 3000) and one for the backend (Node.js, port 8080).
- Focus on implementing your business logic and API endpoints in the Node.js backend.
- All requests are made to the backend on port 8080.
- Next.js simplifies page creation and server-side rendering, but if you don't need it, concentrate on the Node.js part.
