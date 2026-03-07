# Nasapedia
Nasapedia is a comprehensive website that provides space information that the public can understand in an easy way so yeah i try my best to interpret the infos from the data aquired from nasa and other space agencies and make it more understandable for the public so they can understand the space better and learn more about it.

# note: 
- to all those who think the website is ai slop, i just want to say say that i have put a lot of effort into this project and tried not to use ai for any work except for some minor code snippets and stuff but the overall project is done by me.
-btw please vote nicely and fairly cause i want those rpi 5 pleaseeeeeeeeee

### Key Features
- **Searchable Projects**: Full-text keyword search with filters for TRL, organization, and technology area.
- **Advanced Sorting**: Multiple sort modes (relevance, popularity, alphabetical, newest/oldest).
- **Adaptive Feed**: Personalized feed combining popularity and recency, with light randomization to diversify results.
- **Pagination & Performance**: Paginated API responses, client-side debounce, request deduplication, and an LRU cache to improve UX and reduce load.
- **Project Click Tracking**: Click recording endpoint that increments popularity scores and prevents duplicate counts per visitor.
- **Project Details**: Dedicated project detail pages with status indicators, TRL badges, and popularity display.
- **ISS Telemetry**: ISS location endpoint and WebSocket-compatible URL helper for live tracking components.
- **Global Launch Intelligence**: Integration points for launch validation and SpaceDevs diagnostics.
- **Backend Resilience**: FastAPI backend with SQLAlchemy, database health checks, and clear error handling for availability and query failures.
- **Deployment & Migrations**: DB migration scripts and utilities (including Neon-ready helpers) for production rollout.

### Tech Stack
- Frontend: Next.js (app router), React, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL (pgvector support present in migrations)
- Utilities: Lightweight caching, request dedupe, pagination helpers, and modular services

# Setup
alright so setting this up is pretty straightforward, just follow these steps and you should be good:
1. first clone the repo:
    ```zsh
    git clone https://github.com/praneet1503/Nasapedia.git
    ```
2. now lets get the backend running, go into the backend folder and set up a virtual environment (trust me it saves so much pain later):
    ```zsh
    cd Nasapedia/backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
3. now the frontend, just install the dependencies:
    ```zsh
    cd frontend
    npm install
    ```
4. spin up the backend server:
     ```zsh
     uvicorn main:app --reload
     ```
5. and now the frontend dev server:
     ```zsh
     npm run dev
     ```
6. open your browser and go to `http://localhost:3000` and boom you should see Nasapedia!

and thats literally it, you're all set!! if something breaks just check that the backend is running before you open the frontend, that fixes like 90% of the issues lol

# note:
- make sure to have the backend server running before accessing the frontend to ensure that the API endpoints are available for fetching data.
- the backend files are not public right now but i will make them public soon so stay tuned for that and if you have any suggestions or feedback,lemme know ([msg me @!](https://hackclub.enterprise.slack.com/team/U07V12XBSF6))
- the migrations are public but currently no documentation is avalible for it so kindly give me some time to write the docs for it 

# Contributing
- you can fork the repo > make your changes > create a pull request 
- if you have any suggestions or feedback, please feel free to open an issue or reach out to me directly on Slack.

# Docs 
refer to docs folder for detailed documentation on codebase understanding,deployment, and database migrations. (if you are really trying to change the codebase for a new project or something you should read the docs or atleast let ur ai read the docs bro....)

# update 
V1 is live baby!! go check it out [here](https://nasapedia.vercel.app) and please vote for me in the hackathon, i really want those rpi 5s to test this project on and make it even better!!
 