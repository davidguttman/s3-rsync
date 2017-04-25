# s3-rsync #

Sync a local directory to S3, recursively (including files over 5gb).

## Installation ##

    npm i -g s3-rsync

## Usage ##

### As script
    s3-rsync -k <key> -s <secret> -b <bucket> local-dir [s3-prefix]
### or maybe as a cron job, by running:
    crontab -e
    
and appending to your cron file, for example:

    30 2 * * * s3-rsync -k <key> -s <secret> -b <bucket> local-dir [s3-prefix]


(above should run `s3-rsync` every day at 2:30AM)

but don't forget to restard the cron daemon:

    service crond restart

## License ##

MIT
