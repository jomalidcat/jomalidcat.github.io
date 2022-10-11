var cacheName = 'svltweb';
var filesToCache = [

  './index.html',
  './svlt_web.html',
  './svlt_web.js',
  './svlt_web.data',
  './svlt_web.wasm',
  './favicon.ico',
  './loadinganimation.mp4',
  './inkingBlack.png',
  './inkingBlue.png',
  './inkingGreen.png',
  './inkingRed.png',
  './inkingYellow.png',
  './inkingWhite.png',
  './inkingMenuIcon_clear.png',
  './inkingMenuIcon_erase.png',
  './interactionMenuIcon.png',
  //'./fullscreenIcon.png',
  //'./smallscreenIcon.png',
  './sensavis_watermark.png',
  './sensavis_watermark_white.png',
  './viewsMenuIcon_next.png',
  './viewsMenuIcon_nextPressed.png',
  './viewsMenuIcon_pause.png',
  './viewsMenuIcon_play.png',
  './viewsMenuIcon_prev.png',
  './viewsMenuIcon_prevPressed.png',
  './viewsMenuIcon_unselected.png'
];

self.addEventListener('install', function(event) {
  //console.log('SW Installing...')
  /*event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    }).catch(function(error){
      console.log('SW Install fail ', error);
    })
  );*/
  self.skipWaiting();
});

self.addEventListener('fetch', function(event) {

  event.respondWith(

    caches.open(cacheName).then(function(cache) {
      return cache.match(event.request).then(function(response) {
        var fetchPromise = fetch(event.request/*, {cache: 'no-cache'}*/).then(function(networkResponse) {


          //progressMonitor(event.clientId, networkResponse.clone()); 

          /*navigator.storage.estimate().then(function(estimate){                                   //Get estimate of cache available
            networkResponse.clone().blob().then(function(blobsize) {                              //Get size of file to cache
              //console.log('Cache Size available ', estimate.quota-estimate.usage);
              //console.log('Resp Size ', blobsize.size);
              if(estimate.quota-estimate.usage >= blobsize.size) {
                cache.put(event.request, networkResponse.clone()).catch(function(err) {           //Store file in cache if it's size allows it
                  console.log('SW Could not add to cache!', err)
                });
              } else {
                console.log('SW Not enough cache to store file ',networkResponse.clone());
              }              
            });
          });*/


          cache.put(event.request, networkResponse.clone()).catch(function(err) {           //Store file in cache
            console.log('SW Could not add to cache!', err)
          });

          return progressMonitor(event.clientId, networkResponse);
        }).catch(function(err) { 
          console.log('SW Fetch error: ', err)
        })
        return response || fetchPromise;
      })
    })
  );
});

self.addEventListener('activate', function(event) {
  //console.log('SW Active!');
  event.waitUntil(self.clients.claim());
  var msg = 'runsvlt';
  sendMsgToClients({msg});

  /*caches.open(cacheName).then(function(cache) {
    cache.keys().then(function(keys) {
      keys.forEach(function(request,index,array) {
        console.log('req',request.headers.get('Last-Modified'));
        return request.headers.get('Last-Modified');
      }).then(function(abc) {
        console.log('lastmod2', abc);
      })
    });
  });*/

});

function sendMsgToClients(msg) {
  self.clients.matchAll( {includeUncontrolled: true, type: 'window', visibilityState: 'visible'} ).then(all => all.map(client => client.postMessage(msg)));
}

function progressMonitor(clientId, response) {
  if(!response.body) {
    console.debug('No Body found. ReadableStream not supported in this browser?');
    return response;
  }

  const contentLength = response.headers.get('content-length');

  if(contentLength == null) {
    console.debug('No content-length in header response.');
    return response;
  }

  let loaded = 0;
  const total = parseInt(contentLength,10);
  const reader = response.body.getReader();
  
  var msg = 'progresstotal';
  sendMsgToClients({msg, total});

  return new Response(
    new ReadableStream({
      start(controller) {

        let client;
        clients.get(clientId).then(c => {
          client = c;
          read();
        });

        function read() {
          reader.read().then(({done, value}) => {
            if(done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
            loaded = value.byteLength;

            var msg = 'progressloaded';
            sendMsgToClients({msg, loaded});

            read();
          }).catch(error => {
            // error only typically occurs if network fails mid-download
            console.warn('error in read()', error);
            controller.error(error)
          });
        }
      },
      cancel(reason){
        console.warn('Stream cancelled, reason ',reason);
      }
    })
  )
}
