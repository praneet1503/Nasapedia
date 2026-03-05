# backend
i personally use Modal for backend deployment. so the backend code is written around modal's function as a service ,but you can make some changes and deplot it to any platform you like.

## Keep backend running continuously on Modal
The backend Modal function is configured with:
these are the env variables you can change them to however you want 
- `MODAL_MIN_CONTAINERS` = 1 (keeps at least one container always running)
- `MODAL_SCALEDOWN_WINDOW` = 3600 (1 hour, keeps containers alive for 1 hour after last request)


**If you are using modal cli, you can follow the instructions below, otherwise you can change the backend to your needs 
### Deploy backend in modal with autocale part
* For windows or Linux
```zsh
cd backend
export MODAL_MIN_CONTAINERS=1 
export MODAL_SCALEDOWN_WINDOW=3600
python modal_app.py
```
* For Mac
```zsh 
cd backend
export MODAL_MIN_CONTAINERS=1 
export MODAL_SCALEDOWN_WINDOW=3600
python modal_app.py
```
* or with Modal CLI:
```zsh
cd backend
MODAL_MIN_CONTAINERS=1 MODAL_SCALEDOWN_WINDOW=3600 modal deploy modal_app.py
```
# Additional Context:
- The backend is designed to add more features in the coming era so you can modify it to your needs and maybe find something new in it ??? hehehe...!!!!!
- we basically have two main scripts in the backend one is for ingesting data from NASA's TechPort API and the other is for embedding the projects for semantic search which basically reduces time to search for projects by 200ms.
- we first created a local database and then we migrated it to production/remote neon database  using `migrate_to_neon.sh` script the script is safe for me atleast but feel free to make changes and then we created a ingestion script which fetches nasa techport data and then we embed the words into vectors which reduced our time by 200ms and it is damn fast trust me bro.
- then we basically connected some enpoints to the frontend and it is done for me.