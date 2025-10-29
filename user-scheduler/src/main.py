from fastapi import FastAPI
import requests
import os
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI(title='User Scheduler')

USER_API = os.getenv('USER_API','http://user-service:8080')

def job_deactivate():
    url = USER_API + '/api/users/tasks/deactivate-inactive'
    payload = {'reason':'scheduled_run'}
    try:
        r = requests.post(url, json=payload, timeout=10)
        print('scheduler result', r.status_code, r.text)
    except Exception as e:
        print('scheduler error', e)

@app.on_event('startup')
def startup_event():
    sched = BackgroundScheduler()
    sched.add_job(job_deactivate, 'interval', minutes=1)  # run every minute for demo
    sched.start()

@app.get('/')
def root():
    return {'message':'User Scheduler running'}
