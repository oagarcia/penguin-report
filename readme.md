# Penguin Basecamp Report

[![Known Vulnerabilities](https://snyk.io/test/github/oagarcia/penguin-report/bcdb4c41b33da70b23081828b52a2ab77ec4db44/badge.svg)](https://snyk.io/test/github/oagarcia/penguin-report/bcdb4c41b33da70b23081828b52a2ab77ec4db44)
[![dependencies Status](https://david-dm.org/oagarcia/penguin-report/status.svg)](https://david-dm.org/oagarcia/penguin-report)
[![devDependencies Status](https://david-dm.org/oagarcia/penguin-report/dev-status.svg)](https://david-dm.org/oagarcia/penguin-report?type=dev)
[![Code Climate](https://codeclimate.com/github/oagarcia/penguin-report/badges/gpa.svg)](https://codeclimate.com/github/oagarcia/penguin-report)
[![Issue Count](https://codeclimate.com/github/oagarcia/penguin-report/badges/issue_count.svg)](https://codeclimate.com/github/oagarcia/penguin-report)
![Build Status](http://jenkins.zemoga.com/jenkins/buildStatus/icon?job=zemoga-training/penguin/penguin-report-ci)

## Installation

1. Ask for env vars you need to set (sensible data)
2. `npm install`
3. `npm run build` or `babel -w source/ -d build/ -s`
4. `npm start`
5. Check app in defined port (defaults to port 3000)
7. Be moderate with the notify button!!! - hidden in the UI to avoid improper use
6. Happy penguins ;)


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

Enjoy!!
