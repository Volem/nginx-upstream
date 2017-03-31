// Type definitions for [secure-callback] [1.1.7]
// Project: [Secure Callback]
// Definitions by: [volem] <[nodejs.withvolkan.com]>
/// <reference types="typescript" />
/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */

export = NU.NginxUpstream

declare module NU {
    class NginxUpstream {
        /**
         * @param nginxConfigFilePath Full path for nginx configuration file. ie. /etc/nginx/nginx.conf
         * @param cookieName Optional cookiename for sticky session settings. Default myappcookie
         * @param fileSyncTime Optional configuration file flush timeout in miliseconds. Default 10ms
         */
        constructor(nginxConfigFilePath: string, fileSyncTime?: number);
        /**
         * Adds new backend server to the upstream block
         * @param host Backend server ip or host together with port value. ie. 12.34.56.78:8080 or myapp.example.com:80
         * @param callback Calls with error if any
         */
        addBackend(host: string, callback: (err: any) => void);
        /**
         * To retrieve backend server list of the upstream block
         * @param callback Returns backend server array as second parameter
         */
        backendList(callback: (err: any, servers: Array<string>) => void);
        /**
         * Removes the host from upstream block
         * @param host Backend server ip or host together with port value. ie. 12.34.56.78:8080 or myapp.example.com:80
         * @param callback Calls with error if any
         */
        removeBackend(host: string, callback: (err: any) => void);
        /**
         * Enables or disables the backend server at upstream block. ie. Upstream block for that host would be myapp.example.com:80 down
         * @param host Backend server ip or host together with port value. ie. 12.34.56.78:8080 or myapp.example.com:80
         * @param callback Calls with error if any
         */
        toggleBackend(host: string, callback: (err: any) => void);
        
        /**
         * Enables or disables gzip compresion for the server
         * @param enable To enable compresion set to true, otherwise false
         * @param types Types of gzip as array of string. ie. ["text/plain", "text/css"] 
         * Default Types : text/plain, text/css, application/json, application/x-javascript, text/xml, application/xml, application/xml+rss, text/javascript
         * @param callback Returns the status set as the second parameter
         */
        setCompression(enable: boolean, types: Array<string>, callback: (err: any, compressionStatus: boolean) => void)
        /**
         * Toggles between sticky session and round robin. Uses ip_hash and creates a cookie with the name given at constructor
         * @param callback Returns if sticky session enabled or not
         */
        toggleStickySession(cookieName: string, callback: (err: any, stickySessionStatus: boolean) => void);
        /**
         * Sets the Fully Qualified Domain Name for the virtual server
         * @param fqdn Fully Qualified Domain Name. ie. www.example.com
         * @param sitename Sitename alias in nginx config file. Should be unique per nginx server
         * @param callback Calls with error if any
         */
        setServer(fqdn: string, sitename: string, callback: (err: any) => void);
        /**
         * Adds certificate information to nginx config file
         * @param sitename Sitename alias in nginx config file. Should be unique per nginx server
         * @param certificateLocationPath PEM certificate path 
         * @param callback Calls with error if any
         */
        addCertificate(sitename: string, certificateLocationPath: string, callback: (err: any) => void);
        /**
         * Removes certificate information to nginx config file
         * @param callback Calls with error if any
         */
        removeCertificate(callback: (err: any) => void);
    }
}
