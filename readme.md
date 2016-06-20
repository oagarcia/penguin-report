# Penguin Basecamp Report

## Installation

1. Ask for env vars you need to set (sensible data)
2. `npm install`
3. `npm run build` or `babel -w source/ -d build/ -s`
4. `npm run start` in some envs, in order to run port 80 you need sudo in this command
5. Check app in port 80 (port 80 is required for GCM to work)
7. Be moderate with the notify button!!! - hidden in the UI to avoid improper use
6. Happy pinguins ;)


## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D


## Cron Job task.
The cron job to notify users at specific times is located as an independent project under **penguin-cronjob** folder.

Such project is installed as a **now** application.
[https://zeit.co/](https://zeit.co/)

Check it running here!! [https://penguin-cronjob-oiwbxrzujh.now.sh](https://penguin-cronjob-oiwbxrzujh.now.sh)
