# nginx-upstream [![Build Status](https://travis-ci.org/Volem/nginx-upstream.svg?branch=master)](https://travis-ci.org/Volem/nginx-upstream)

Currently it is on release v0.1.3 and maintains primary functionality over nginx config file. Usage is pretty simple, you can use it with require to get our main class and use its instance with below constructor parameters.

```bash
npm install nginx-upstream --save
```
```js
var NginxManager = require('nginx-upstream');
var nginxManager = new NginxManager('<path>/nginx.conf', 50);
```
First of all, let's take a look at the type definition of the package starting from constructor.
```js
class NginxUpstream {
    constructor(nginxConfigFilePath: string, fileSyncTime?: number);
```
As expected our class initializes with the nginx config file path as first parameter. Second parameter is the timeout for waiting changes on config file. Default is 50ms and it is generally ok for nowadays disks.

Nginx requires upstream block for load balancing operations. You can add new backend to your upstream block by addBackend method. Below is the definition of it;
```js
addBackend(host: string, callback: (err: any) => void);
```
addBackend method requires the host definition together with the port where the backend application server exits. This host definition can be either like ip:port or like fqdn:port. ie. 123.45.67.89:80 or www.example.com:81

Here port definition is always required even if your backend server is a web server and by default hosts over 80 port, you need to mention this to your Nginx server and our method also requires this port information to set nginx configuration file correctly.

Second parameter is callback, where you need to provide to understand if the configuration set successfully or not. Usage example;
```js
nginxManager.addBackend('mybackendserver.io:8081', function(err){
  if(err){
    console.log(err);
    return;
  } else {
    // Do something after backend server added.
  }
});
```
Another method is of nginx-upstream is toggleBackend, which is for enabling or disabling your backend server. This is realy useful when you want to make maintenance on one of your backend server or something is wrong with it and you want it to be disabled temporarily. Even if you want to remove your backend server than it is wise to disable it first and than remove it. 

Below is the definition and usage of toggleBackend;
```js
// Definition
toggleBackend(host: string, callback: (err: any, status: boolean) => void);

// Usage
nginxManager.toggleBackend('localhost:81', function(err, status){
  if(err){
    console.log(err);
    return;
  } else if(status)
    // Do something if status enabled.
  } else {
    // Do something else if status disabled.
  }
});
```
It is like add backend and it requires the host name together with its port. When you toggle your backend host "localhost:81" of this configuration.
```nginx
# Upstream Servers
upstream nginxconf {
    server localhost:81;
    server localhost:82;
}
```
the nginx configuration file would be like below;
```nginx
# Upstream Servers
upstream nginxconf {
    server localhost:81 down;   # Disabled backend
    server localhost:82;
}
```
Ofcourse we have another method for removing the backend server from the nginx configuration file. It goes like below for the same upstream block;
```js
// Definition
removeBackend(host: string, callback: (err: any) => void);
// Usage
nginxManager.removeBackend('localhost:81', function(err){
  if(err){
    console.log(err);
    return;
  } else
    // Do something after backend server removed.
});
```
After calling the removeBackend method, upstream block would be;
```nginx
# Upstream Servers
upstream nginxconf {
    server localhost:82;
}
```
