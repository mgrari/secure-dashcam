



# MongoDB Admin Authentication Setup on Linux

This guide outlines how to set up MongoDB admin authentication on a Linux system.

---

## **1. Locate and Edit MongoDB Configuration File**

The default MongoDB configuration file is located at:

```bash
/etc/mongod.conf
```

To edit it, use your preferred text editor. For example:

```bash
sudo nano /etc/mongod.conf
```

---

## **2. Temporarily Disable Authentication**

In the `mongod.conf` file, comment out the `authorization` line under the `security` section, or ensure it looks like this:

```yaml
security:
  #authorization: `enabled`
```

Save and exit the editor.

---

## **3. Restart MongoDB**

Restart MongoDB to apply the changes:

```bash
sudo systemctl restart mongod
```

---

## **4. Connect to MongoDB Without Authentication**

Access the MongoDB shell:

```bash
mongosh
```

---

## **5. Switch to the `admin` Database**

In the MongoDB shell, switch to the `admin` database:

```javascript
use admin;
```

---

## **6. Create an Admin User**

Create a user with the `root` role for administrative privileges:

```javascript
db.createUser({
    user: `admin`,
    pwd: `admin123`, // Replace with a secure password
    roles: [{ role: `root`, db: `admin` }]
});
```

---

## **7. Re-enable Authentication**

Reopen the `mongod.conf` file:

```bash
sudo nano /etc/mongod.conf
```

Uncomment the `authorization` line under the `security` section or add it if it does not exist:

```yaml
security:
  authorization: `enabled`
```

Save and exit the file.

---

## **8. Restart MongoDB**

Restart MongoDB to enable authentication:

```bash
sudo systemctl restart mongod
```

---

## **9. Test Admin Authentication**

Connect to MongoDB with authentication enabled:

```bash
mongosh -u admin -p admin123 --authenticationDatabase admin
```

---

## **10. Update the `.env` File**

Update your `.env` file with the new connection string:

```env
DB_URL=`mongodb://admin:admin123@127.0.0.1:27017/dashcamssd?authSource=admin`
```


---

## **Complete `mongod.conf` Example for Linux**

Below is a complete example of the `mongod.conf` file with authentication enabled:

```yaml
# Where and how to store data.
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

# Where to write logging data.
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# Network interfaces
net:
  port: 27017
  bindIp: 127.0.0.1  # Local connections only

# Security settings
security:
  authorization: enabled
```


## MACOS Instalation.

  

Connect to MongoDB Without Authentication: Open the MongoDB shell:

  
  
  

## **Create an Admin User**

  

1. **Edit MongoDB Configuration File**:

Locate your MongoDB configuration file (`mongod.conf`). 

```bash
/usr/local/etc/mongod.conf  
```
**1 )Temporarily Disable Authentication**:

-   Comment out the `authorization: enabled` line in `mongod.conf`
- **Restart MongoDB:**
```bash
brew services restart mongodb/brew/mongodb-community
```
**2) Connect to MongoDB Without Authentication**: Open the MongoDB shell:
```bash
mongosh 
```
**3) Switch to the `admin` Database**:
```bash
use admin;
```
**4) Create an Admin User**: 
```bash
db.createUser({
    user: `admin`,
    pwd: `admin123`, // Replace with a secure password
    roles: [{ role: `root`, db: `admin` }]
});
```
**5) Re-enable Authentication**:
- Uncomment the `authorization: enabled` line in `mongod.conf`:

- Restart MongoDB:
	```bash
	brew services restart mongodb/brew/mongodb-community
	```
**6) Update the `.env` File**:
```bash
DB_URL=`mongodb://admin:admin123@127.0.0.1:27017/dashcamssd?authSource=admin`
```