# 🐳 Podcastic - Unraid Installation Guide

Complete guide to install Podcastic on Unraid as a **single all-in-one container**.

## 📋 What's Included

This single Docker container includes:
- ✅ **Backend**: Node.js + Express.js API
- ✅ **Frontend**: React web interface
- ✅ **Database**: MongoDB (embedded)
- ✅ **Cache**: Redis (embedded)
- ✅ **Web Server**: Nginx reverse proxy
- ✅ **Process Manager**: Supervisor (manages all 5 services)

All in **ONE container** on port **3579**

## Prerequisites

- Unraid server with Docker support
- ~2GB RAM available
- ~20GB storage for database/media
- Internet connection

## Installation Steps

### Step 1: Clone Repository

```bash
# Via terminal on Unraid
cd /mnt/user/appdata  # or your preferred path
git clone https://github.com/R0m1k3/podcastic.git
cd podcastic
```

Or download as ZIP from GitHub and extract.

### Step 2: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your settings
nano .env
```

**Key settings**:
```env
NODE_ENV=production

# JWT Secret - CHANGE THIS!
JWT_SECRET=your-super-secret-key-change-me-in-production

# Optional: PodcastIndex API for podcast search
PODCAST_INDEX_API_KEY=
PODCAST_INDEX_API_SECRET=
```

### Step 3: Build Docker Image

Option A: Build locally (takes ~5-10 minutes)
```bash
docker-compose -f docker-compose.unraid.yml build --no-cache
```

Option B: Use pre-built image (faster)
```bash
# Will be available after first push to Docker Hub
# docker pull r0m1k3/podcastic:latest
```

### Step 4: Start Container

```bash
# Start
docker-compose -f docker-compose.unraid.yml up -d

# View logs
docker-compose -f docker-compose.unraid.yml logs -f podcastic

# Check status
docker ps | grep podcastic
```

### Step 5: Access Application

Open browser:
```
http://your-unraid-ip:3579
```

**First Time Setup**:
1. Click "Create Account"
2. Register with email/password
3. Log in
4. Go to "Discover" to search podcasts
5. Subscribe and listen!

---

## 📊 Container Architecture

```
Single Container (podcastic)
├── Nginx (port 3579)
│   ├── Serves static frontend
│   └── Proxies /api to backend
├── Node.js Backend (internal port 5000)
│   ├── API routes
│   ├── Authentication
│   └── Database management
├── MongoDB (internal port 27017)
│   └── Podcast data storage
└── Redis (internal port 6379)
    └── Cache & sessions
```

All services communicate **internally** - only port 3579 exposed.

---

## 🛠️ Unraid Integration

### Add to Unraid via WebUI

1. **Settings → Docker** → Enable Docker
2. **Docker** tab
3. Add custom template:
   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <Container version="2">
     <Name>podcastic</Name>
     <Repository>r0m1k3/podcastic:latest</Repository>
     <Registry>https://hub.docker.com/</Registry>
     <Network>bridge</Network>
     <MyIP/>
     <Shell>sh</Shell>
     <Privileged>false</Privileged>
     <Support/>
     <Project/>
     <Overview/>
     <Category/>
     <WebUI>http://[IP]:[PORT:3579]</WebUI>
     <TemplateURL/>
     <Icon/>
     <ExtraParams/>
     <PostArgs/>
     <StaticNetwork>false</StaticNetwork>
     <DonateText/>
     <DonateLink/>
     <Description>Podcastic - Multi-user podcast streaming application</Description>
     <Networking>
       <Mode>bridge</Mode>
       <Publish>
         <Port>
           <HostPort>3579</HostPort>
           <ContainerPort>3579</ContainerPort>
           <Protocol>tcp</Protocol>
         </Port>
       </Publish>
     </Networking>
     <Data>
       <Volume>
         <HostDir>/mnt/user/appdata/podcastic/db</HostDir>
         <ContainerDir>/data/db</ContainerDir>
         <Mode>rw</Mode>
       </Volume>
       <Volume>
         <HostDir>/mnt/user/appdata/podcastic/redis</HostDir>
         <ContainerDir>/data/redis</ContainerDir>
         <Mode>rw</Mode>
       </Volume>
       <Volume>
         <HostDir>/mnt/user/appdata/podcastic/logs</HostDir>
         <ContainerDir>/var/log/supervisor</ContainerDir>
         <Mode>rw</Mode>
       </Volume>
     </Data>
     <Environment>
       <Variable>
         <Name>JWT_SECRET</Name>
         <Value>change-me-in-production</Value>
       </Variable>
       <Variable>
         <Name>PODCAST_INDEX_API_KEY</Name>
         <Value/>
       </Variable>
       <Variable>
         <Name>PODCAST_INDEX_API_SECRET</Name>
         <Value/>
       </Variable>
     </Environment>
   </Container>
   ```

Or use Docker Compose tab with `docker-compose.unraid.yml`

---

## 📂 Data Persistence

Data is saved to Unraid shares:

```
/mnt/user/appdata/podcastic/
├── db/          # MongoDB data (podcasts, users, episodes)
├── redis/       # Redis cache data
└── logs/        # Application logs
```

### Backup

```bash
# Backup database
docker exec podcastic mongodump --out /backup/mongodb

# Copy to safe location
cp -r /mnt/user/appdata/podcastic /mnt/backup/podcastic-backup
```

### Restore

```bash
docker exec podcastic mongorestore /backup/mongodb
```

---

## 🔧 Management Commands

### View Logs

```bash
# All logs
docker logs -f podcastic

# Specific service
docker exec podcastic tail -f /var/log/supervisor/backend.out.log
docker exec podcastic tail -f /var/log/supervisor/mongodb.out.log
docker exec podcastic tail -f /var/log/supervisor/redis.out.log
docker exec podcastic tail -f /var/log/supervisor/nginx.out.log
```

### Restart Container

```bash
docker-compose -f docker-compose.unraid.yml restart podcastic
```

### Stop Container

```bash
docker-compose -f docker-compose.unraid.yml down

# Keep volumes (data persists)
# Data in /mnt/user/appdata/podcastic/ is preserved
```

### Update to Latest

```bash
# Pull latest code
cd /path/to/podcastic
git pull

# Rebuild and restart
docker-compose -f docker-compose.unraid.yml build --no-cache
docker-compose -f docker-compose.unraid.yml up -d
```

---

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker logs podcastic

# Common issues:
# - Port 3579 in use: Change in docker-compose.unraid.yml
# - Insufficient RAM: Free up memory
# - Permission issues: Check volume permissions
```

### MongoDB not starting

```bash
# Check mongo logs
docker exec podcastic tail -f /var/log/supervisor/mongodb.out.log

# Repair database
docker exec podcastic mongod --repair --dbpath /data/db
```

### Can't access on port 3579

```bash
# Check if container is running
docker ps | grep podcastic

# Check if port is open
netstat -tulpn | grep 3579

# Test connection
curl http://localhost:3579/health
```

### Out of disk space

MongoDB can grow large. Check:
```bash
docker exec podcastic du -sh /data/db

# Clean old data (backup first!)
```

---

## 📈 Performance Optimization

### For Limited Resources

Edit `docker-compose.unraid.yml`:
```yaml
# Limit memory usage
mem_limit: 1g
cpus: '0.5'
```

### For High Performance

Increase limits:
```yaml
mem_limit: 4g
cpus: '2'
```

### Disable Unneeded Features

If only streaming (no search):
```env
PODCAST_INDEX_API_KEY=  # Leave empty
```

---

## 🔒 Security Notes

### Change Default Secrets

```env
# MUST change in production!
JWT_SECRET=your-unique-secret-key-here

# Use strong password for first admin account
```

### Firewall Rules

Allow only trusted IPs:
```bash
# On Unraid, set firewall rules in UI
# Or use nginx config to restrict access
```

### SSL/HTTPS Setup

If exposing to internet, use reverse proxy with SSL:
- Nginx Proxy Manager (separate container)
- Traefik (with Let's Encrypt)
- Unraid built-in reverse proxy

---

## 📊 Monitoring

### Check Container Health

```bash
# Real-time stats
docker stats podcastic

# Service status
docker exec podcastic supervisorctl status

# Expected output:
# mongodb                       RUNNING   pid 123, uptime 0:00:45
# redis                         RUNNING   pid 124, uptime 0:00:45
# backend                       RUNNING   pid 125, uptime 0:00:45
# nginx                         RUNNING   pid 126, uptime 0:00:45
```

### Resource Usage

```bash
# Disk usage
du -sh /mnt/user/appdata/podcastic/

# Memory usage
docker exec podcastic free -h

# CPU usage
docker stats --no-stream podcastic
```

---

## 🆘 Support

If issues occur:

1. **Check logs**:
   ```bash
   docker logs podcastic
   ```

2. **Check service status**:
   ```bash
   docker exec podcastic supervisorctl status
   ```

3. **Rebuild container**:
   ```bash
   docker-compose -f docker-compose.unraid.yml build --no-cache
   docker-compose -f docker-compose.unraid.yml up -d
   ```

4. **Factory reset** (loses all data!):
   ```bash
   docker-compose -f docker-compose.unraid.yml down -v
   rm -rf /mnt/user/appdata/podcastic
   # Start fresh
   ```

---

## 🎯 Next Steps

1. **First Run**: Create account, set JWT_SECRET properly
2. **Configure PodcastIndex**: Optional, enables podcast search
3. **Add Podcasts**: Via Discover or RSS URLs
4. **Enjoy**: Start listening!

---

## 📚 Additional Resources

- **Main README**: See README.md
- **Getting Started**: See GETTING_STARTED.md
- **PodcastIndex Setup**: See PODCAST_INDEX_SETUP.md
- **GitHub**: https://github.com/R0m1k3/podcastic

---

**Last Updated**: 2026-04-16  
**Tested on**: Unraid 6.12+
