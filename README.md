# nower

Websockets server for Bunker

## Service file example
`/etc/systemd/system/nower.service`:
```[Unit]
Description=Nower Server (Bunker Websockets)

[Service]
ExecStart=/usr/bin/nodejs /var/www/nower/index.js
WorkingDirectory=/var/www/nower
Restart=always
 RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=nower

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable nower`

`sudo systemctl start nower`

## Running in debug mode
Add to `/etc/systemd/system/nower.service`:
```
[Service]
Environment=DEBUG=1
```