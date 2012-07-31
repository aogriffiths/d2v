(/*!
  * gss - Google Spreadsheet JavaScript Library v0.1
  */
		
function () {
  Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
  }

  Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
  }
})();


vis.scope = "https://spreadsheets.google.com/feeds";

(function () {
  var spreadsheetListeners = [];  
  vis.fireSpreadsheetListener = function(){
     for(var i=0, listener; listener = spreadsheetListeners[i]; i++){
       listener();
     }
  }
  vis.addSpreadsheetListener = function(func){
    spreadsheetListeners.push(func);  
  }

  var spreadsheetInfoListeners = [];  
  vis.fireSpreadsheetInfoListener = function(){
     for(var i=0, listener; listener = spreadsheetInfoListeners[i]; i++){
       listener();
     }
  }
  vis.addSpreadsheetInfoListener = function(func){
    spreadsheetInfoListeners.push(func);  
  }

  var worksheetListeners = [];  
  vis.fireWorksheetListener = function(sskey, wskey){
     for(var i=0, listener; listener = worksheetListeners[i]; i++){
       listener(sskey, wskey);
     }
  }
  vis.addWorksheetListener = function(func){
    worksheetListeners.push(func);  
  }
})();

(function () {
  var spreadsheets = localStorage.getObject('spreadsheets') || {};
  vis.addSpreadsheet = function (sskey) {
    spreadsheets[sskey]={'worksheets':null,'name':null, 'key':sskey};
    localStorage.setObject('spreadsheets', spreadsheets);
    vis.fireSpreadsheetListener();
  }
  vis.delSpreadsheet = function (sskey) {  
    delete spreadsheets[sskey];
    localStorage.setObject('spreadsheets', spreadsheets);
    vis.fireSpreadsheetListener();
  }
  vis.getSpreadsheet = function(sskey){
    return spreadsheets[sskey];
  }
  vis.getSpreadsheets = function(){
    return spreadsheets;
  }
  
  vis.getSpreadsheetsList = function(){
    var list = [];
    for (var item in spreadsheets){
      var d = spreadsheets[item];
      d.key = item;
      list.push(d);
    }
    return list;
  }  
  
  vis.getSpreadsheetInfo = function(sskey){
    var url = vis.scope + "/worksheets/" + sskey + "/private/full"
    var handleResponse = function(response) { 
       spreadsheets[sskey].name = response.feed.title.$t;
       var worksheets = {};
       for(var i = 0, ws; ws = response.feed.entry[i]; i++){ 
         var id = (ws.id.$t).split("/").pop();         
         worksheets[id] = {'id':id,'name':ws.title.$t};
       }
       spreadsheets[sskey].worksheets = worksheets;
       localStorage.setObject('spreadsheets', spreadsheets);
       vis.fireSpreadsheetListener();
    }
    vis._pullFeed(vis.scope,url,handleResponse);
  }

  vis.getWorksheet = function(sskey, wskey){
    return spreadsheets[sskey].worksheets[wskey];
  }  
  
  vis.getWorksheets = function(sskey){
    return spreadsheets[sskey].worksheets;
  }  
  
  vis.getWorksheetsList = function(sskey){
    var list = [];
    var worksheets = spreadsheets[sskey].worksheets
    for (var item in worksheets){
      var d = worksheets[item];
      list.push(d);
    }
    return list;
  }  
  vis.downloadWorksheet = function(sskey, wskey){
    var handleResponse = function(response) { 
      var entries = response.feed.entry;  
      if (!entries || !entries.length) {  
        alert('No data entries found in this worksheet!');  
        return;  //TODO ERROR HANDEL
      }  
      var json = []; 
      var gsxkeys = []
      for (var key in entries[0]) {  
        if (key.indexOf("gsx$")==0){
          gsxkeys.push(key);
        }
      }  
      for (var i = 0, entry; entry = entries[i]; i++) {  
          json[i]={};
          for (var j = 0, key; key = gsxkeys[j]; j++){          
            json[i][key.substr(4)] = entry[key].$t;
        }
      }  
      var fullkey = sskey + "__" + wskey
      localStorage.setObject(fullkey, json);
      vis.fireWorksheetListener(sskey, wskey);
    }
    vis._pullSpreadsheet(vis.scope,"list",sskey, wskey,"private",handleResponse);
  }  
  
  vis.readLocalWorksheet = function(sskey, wskey){
    var fullkey = sskey + "__" + wskey
    return localStorage.getObject(fullkey);
  }  

  vis.readLocalOrDownloadWorksheet = function(sskey, wskey){
    var fullkey = sskey + "__" + wskey
    return localStorage.getObject(fullkey);
  }  
  
/*    
  vis.addWorksheet = function(sskey, wskey) {
    spreadsheets[sskey][wskey]=null;
    localStorage.setObject('spreadsheets', spreadsheets);
  }
  vis.delWorksheet = function(sskey, wskey) {  
    delete spreadsheets[sskey][wskey];
    localStorage.setObject('spreadsheets', spreadsheets);
  }
  */
})();

vis._pullSpreadsheet = function(scope, feed, sskey, wskey, pubpriv, handleResponse) {  
  //see at http://code.google.com/apis/gdata/samples/spreadsheet_sample.html
  //var template = "{scope}/{feed}/{spreadsheet_key}/{worksheet_id}/{pubpriv}/full"

  var parts = [];
  parts.push(scope, feed, sskey, wskey, pubpriv, "full");
  var feedURL = parts.join("/");
  vis._pullFeed(scope,feedURL, handleResponse);
}

vis._pullFeed = function(scope, feedURL, handleResponse) {  
  if (google.accounts.user.checkLogin(scope + "/")) {     
    //see "What is the service name in ClientLogin for each Data API?"
    //at http://code.google.com/apis/gdata/faq.html
    var service = new google.gdata.client.GoogleService('wise', 'vis-v0.1.0');   
    service.getFeed(feedURL, handleResponse, vis._handleError);  
  } else {  
    var token = google.accounts.user.login(scope); // can ignore returned token  
  }  
};  

vis._handleError = function(e) {  
  alert('Error: ' + e.cause ? e.cause.statusText : e.message);  
};  

/**
 * vis.unique
 * @param {Array} data  An array of objects 
 * @param {String} field  The field to find unique values for
 * @returns {Array}  An array containing unique objects that have only one field (the field specified in the field param)
 */
vis.unique = function(data, field){
  var foundalready = {};
  var dataout = [];
  for(var i = 0, row; row = data[i]; i++){
    var value = row[field];
    if(! foundalready[value]){
      foundalready[value] = true;
      var t = {};
      t[field] = value;
      dataout.push(t);
    }
  }
  return dataout;
}
