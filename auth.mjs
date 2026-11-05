import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
const derive=promisify(scrypt),options={N:32768,r:8,p:1,maxmem:64*1024*1024};
export async function hashPassword(password){const salt=randomBytes(16).toString('hex');return `scrypt:${salt}:${(await derive(password,salt,64,options)).toString('hex')}`;}
export async function verifyPassword(password,encoded){
 const [algorithm,salt,key]=String(encoded).split(':');
 if(algorithm!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(key))return false;
 const actual=await derive(password,salt,64,options);return timingSafeEqual(actual,Buffer.from(key,'hex'));
}
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function createAuthStore(filename,bootstrap={}){
 if(filename!==':memory:')mkdirSync(path.dirname(filename),{recursive:true});
 const db=new DatabaseSync(filename);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,name TEXT NOT NULL,password_hash TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);');
 if(!db.prepare('SELECT id FROM users LIMIT 1').get()){
  if(!bootstrap.passwordHash||!bootstrap.username){db.close();throw Error('Configure BOOTSTRAP_ADMIN_HASH and BOOTSTRAP_ADMIN_USERNAME before first start.');}
  db.prepare('INSERT INTO users(id,username,name,password_hash,role) VALUES(?,?,?,?,?)').run(randomUUID(),bootstrap.username,'Адміністратор',bootstrap.passwordHash,'admin');
 }
 const publicUser=row=>row?{id:row.id,username:row.username,name:row.name,role:row.role,active:!!row.active}:null;
 return {
  db,
  find:username=>db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(username),
  list:()=>db.prepare('SELECT id,username,name,role,active FROM users ORDER BY name').all().map(publicUser),
  session:token=>publicUser(db.prepare('SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>? AND u.active=1').get(tokenHash(token),Date.now())),
  issue(userId){db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token),userId,Date.now()+12*60*60*1000);return token;},
  revoke:token=>db.prepare('DELETE FROM sessions WHERE token=?').run(tokenHash(token)),
  revokeUser:id=>db.prepare('DELETE FROM sessions WHERE user_id=?').run(id),
  async add({username,name,password}){
   const row={id:randomUUID(),username:username.toLowerCase(),name,passwordHash:await hashPassword(password)};
   db.prepare('INSERT INTO users(id,username,name,password_hash,role) VALUES(?,?,?,?,?)').run(row.id,row.username,row.name,row.passwordHash,'representative');return {id:row.id,username:row.username,name:row.name,role:'representative',active:true};
  },
  async password(id,password){db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(await hashPassword(password),id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);},
  active(id,active){db.prepare('UPDATE users SET active=? WHERE id=?').run(active?1:0,id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);},
  close:()=>db.close(),
 };
}
