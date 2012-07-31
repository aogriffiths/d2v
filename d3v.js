//d3v.js Data Driven Document VIEWS 
//Version 1

/*

 * var body = d3.select("body");
 * 
 * 
 * vs = new viewset();
 *
 * vs.addview("one")
 *  .elem("div.eg1")
 *    .elem("p")
 *      .elem("b")
 *        .text("Hello World");
 *    
 * vs.addview("two")
 *  .elem("div.eg1")
 *    .elem("p")
 *      .elem("i")
 *        .text("Hello World");
 *  
 * vs.addview("three")
 *  .elem("div.eg1")
 *    .elem("p")
 *      .elem("u")
 *        .text("Hello World");
 *
 * vs.mode("loop"); // loop | sequenced | named
 * vs.drawinto(body);
 * 
 * v4 = new view()
 *  .elem("div.eg2")
 *    .elem("div.top")
 *      .lookupview("top")
 *      .close()
 *    .elem("div#bottom")
 *      .lookupview("bottom")
 *      .close()
 *      
 * v4
 *    .setview("top",v1)
 *    .setview("bottom",v2);
 *    
 * v4.drawinto(body);
 * 
 * v4
 *    .setview("bottom",v3);
 *    
 * v4.redraw();
 */

if (!Array.prototype.filter)
{
  Array.prototype.filter = function(fun /*, thisp */)
  {
    "use strict";

    if (this == null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun != "function")
      throw new TypeError();

    var res = [];
    var thisp = arguments[1];
    for (var i = 0; i < len; i++)
    {
      if (i in t)
      {
        var val = t[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, t))
          res.push(val);
      }
    }

    return res;
  };
}

function viewset(){
  this._views = {};
  this._views_count = 0;
  this._views_order = [];
  this._drawmode = "sequenced";
 }
//sequence | loop |  first
viewset.prototype.drawmode = function(drawmode) {
  if (arguments.length == 0)
    return this._drawmode;
  this._drawmode = drawmode;
  return this;
}

viewset.prototype.viewlist = function() {
    return this._views_order;
}

viewset.prototype.view = function(name, v) {
  if (arguments.length == 0)
    return this._views;
  if (arguments.length == 1)
    return this._views[name];
  //TODO account for two views being added with the same name...
  this._views[name] = v;
  this._views_order.push(v);
  this._views_count++;
  return this;
}

viewset.prototype.addview = function(name) {
  var v = new view();
  v.name(name);
  this.view(name,v)
  return v;
}

viewset.prototype.clonenewview = function(name, fromname) {
  var v = this.view(fromname);
  v = v.clone();
  v.name(name);
  this.view(name,v);
  return v;
}

viewset.prototype.clonelastview = function(name) {
  var v = this._views_order[this._views_order.length-1];
  if(v==null){
    v = this.addview(name);
  }
  v = v.clone();
  v.name(name);
  this.view(name,v);
  return v;
}

viewset.prototype.drawinto = function(sel) {
  var timeout = 0;
  var views = this._views_order;
  var drawmode = this.drawmode();
  if(views.length > 0){
    var i = 0;
    function dodraw(){
      v = views[i];
      v.drawinto(sel);
      i ++;
      if(drawmode == "sequenced-loop" && (!views[i]) ){
        i = 0;
      }
      if(views[i] && (drawmode.indexOf("sequenced") == 0)){
        setTimeout(dodraw,v.duration());
      }
    }  
    dodraw();
  }
}


function view(clonefrom,jumptoviews) {
  if (!(this instanceof arguments.callee))
    return new view(clonefrom); // allows dropping of the "new" keyword

  //Clone needs to handle these in a particular way
  this._parent_view = null; //TODO
  this._children = {};
  this._name = clonefrom ? clonefrom._name : "";
  this._last_parent_selection = clonefrom ? clonefrom._last_parent_selection : null;
  this._jumptoviews = jumptoviews? jumptoviews : {};

  //Slots
  this._own_slots = {}; //this map will get filled below;
  this._child_slots = {}; //cloning the children will recreate _child_slots in their parents.
  

  if(clonefrom){
    for(var name in clonefrom._children){
      var child = clonefrom._children[name];
      var newchild = new view(child,this._jumptoviews);
      
      newchild._parent_view = this;
      this._jumptoviews[newchild._selector] = newchild;
      this._children[name] = newchild;
    }
    for(var name in clonefrom._own_slots){
      this.openslot(name);
    }
  }
  
  

  //Clone makes new copies of these
  this._i           = clonefrom ? clonefrom._i                  : 0;
  this._selector    = clonefrom ? clonefrom._selector           : null;
  
  this._todo        = clonefrom ? clone(clonefrom._todo)        : [];
  this._todo_keyed  = clonefrom ? clone(clonefrom._todo_keyed)  : {};
  this._default_duration        = clonefrom ? clonefrom._default_duration  : 1000;
  
  this._transitiondefs = clonefrom ? clone(clonefrom._transitiondefs) : [];
  this._cascade_transitiondefs = clonefrom ? clone(clonefrom._cascade_transitiondefs) : [];

  //Clone points to the same copies of these
  this._data        = clonefrom ? clonefrom._data               : null;
  this._data_key    = clonefrom ? clonefrom._data_key              : null;
  this._selection   = clonefrom ? clonefrom._selection          : null;
}

view.prototype.data = function(data, data_key) {
  if (!arguments.length)
    return this._data;
  this._data = data;
  this._data_key = data_key;
  return this;
}

view.prototype.name = function(name) {
  if (!arguments.length)
    return this._name;
  this._name = name;
  return this;
}

view.prototype.duration = function(default_duration) {
  if (!arguments.length)
    return this._default_duration;
  this._default_duration = default_duration;
  return this;
}

view.prototype.parent = function(parent_view) {
  if (!arguments.length)
    return this._parent_view;
  this._parent_view = parent_view;
  
  return this;
}

view.prototype.selector = function(selector) {
  if (!arguments.length)
    return this._selector;
  delete this._jumptoviews[this._selector];
  this._selector = selector;
  this._jumptoviews[selector] = this;
  return this;
}

//cascade not working yet...
view.prototype.transition = function(item_match,crud_match,flags,callback) {
  if (!arguments.length)
    return this._transitions;
  var transitiondef = {
      'item_match': item_match instanceof RegExp ? item_match : new RegExp(item_match),
      'crud_match': crud_match instanceof RegExp ? crud_match : new RegExp(crud_match),
      'flags': flags,
      'callback': callback        
  };
  this._transitiondefs.push(transitiondef);
  if(flags.match(/C/i))
    this._cascade_transitiondefs.push(transitiondef);
  return this;
}

view.prototype.toString = function() {
  return this._selector;
};

view.prototype.addtodo = function(type, name, value) {
  var key = type + "_" + name;
  if (arguments.length < 2)
    return;
  if (arguments.length == 2 || value == undefined ){
    this._todo_keyed[key];
    return;
  }
  if (arguments.length == 3){
    var currentvalue = this._todo_keyed[key];
    if(currentvalue){
      var i = 0;
      for(var value_todo; value_todo = this._todo[i]; i++){
        if(currentvalue == value_todo){
          delete this._todo[i];
          break;
        }
      }
    }
    var td = {
        type:type,
        name:name,
        value:value        
      }
    this._todo.push(td);
    this._todo_keyed[key] = td;
    return this;
  }
}


view.prototype.jumptoviews = function(jumptoviews) {
  if (!arguments.length)
    return this._jumptoviews;
  this._jumptoviews = jumptoviews;
  return this;
}

view.prototype.jumpto = function(elemname) {
  return this._jumptoviews[elemname];
}

view.prototype.remove = function() {
  delete this._parent_view._children[this._selector];
}


view.prototype.attr = function(name, value) {
  this.addtodo("attr", name, value);
  return this;
}

view.prototype.style = function(name, value) {
  this.addtodo("style", name, value);
  return this;
}

view.prototype.on = function(name, fn) {
  this.addtodo("on", name, fn);
  return this;
}

view.prototype.text = function(value) {
  this.addtodo("text", "text", value);
  return this;
}

view.prototype.call = function(value) {
  this.addtodo("call", "call", value);
  return this;
}

view.prototype.each = function(value, name) {
  this.addtodo("each", name || ++this._i, value);
  return this;
}

view.prototype.view = function(value, name) {
  this.addtodo("view", name || ++this._i, value);
  return this;
}

view.prototype.openslot = function(name) {
  var childslot = {
    name: name,
    view: this
  }
  this._own_slots[name] = true; 
  var view = this._parent_view;
  while(view){
    view._child_slots[name] = childslot; 
    view = view._parent_view;
  }
  return this;
}

view.prototype.fillslot = function(name, view) {
  var slotview = null;
  if(this._own_slots[name]){
    slotview = this;
  }else{
    slotview = this._child_slots[name];
  }
  if(!slotview) throw "no such slot " +  name;
  
  slotview.view.view(view,name);

  return this;
}

view.prototype.elem = function(selector,uid) {
  var child;
  child = this._children[uid || selector];
  if (! child) {
    child = view()
             .jumptoviews(this.jumptoviews())
             .parent(this)
             .selector(selector)
             .duration(this._default_duration);

    this._children[uid || selector] = child
  }
  return child;
}

view.prototype.close = function() {
  return this._parent_view;
}

view.prototype.clone = function() {  
  return new view(this);
}

view.prototype.chart = function() {  
  var that = this;
  return function(selection){
    that.drawinto(selection);
  };
}
/*
 *   Drawns this view into a d3 "parent" selection .
 *   If the parent selection previously had a view drawn into it the old view will 
 * be transitioned to the new.
 *   To avoid elements of an old view being removed when the newview is drawn in
 * ensure the newview is created as a clone of the oldview and adapted form there.
 *   
 * 
 */
view.prototype.drawinto = function(selection) {

  //get previous view from the selection "__view__" variable
  //and set this view as the new view in the "__view__" variable.
  //this allows for effiencet ew and the from view) and also simple redraw()'ing
  //becuase a selection is given a link to the view that was used to draw it.
  
  //Take the first view as the from view, assume they are all the same
  var fromview = null;  
  var ele = selection[0][0];
  if(ele && ele.__view__) {
    fromview = ele.__view__;
  }
  
  //Set this as the view for all elements, the view can then be discovered from any element later on
  for(var i = 0; i < selection.length; i++){
    for(var j = 0; j < selection[i].length; j++){
      if(ele) //TODO SHOULD THERE NOT ALWAYS BE AN ELE here? SOMETHIng to do with when elements are removed?
      ele.__view__ = this;
    }
  }
    
  var transitiondefs   = clone(this._transitiondefs);
  var default_duration = this._default_duration;
  var lasttransition   = null;
  
  function findtransitionselection(selector, type, name, crud){
    var transition = null;
    for(var i = transitiondefs.length-1; i>=0; i--){
      var transitiondef = transitiondefs[i];
      var itemid
         = transitiondef.item_match.source.indexOf(':') === -1
         ? name
         : selector + ":" + type + ":" + name;
      if(itemid.match(transitiondef.item_match)){
        if(crud.match(transitiondef.crud_match)){
          //Try to reuse a transitionselection from this transition
          if(transitiondef.transition){
            transition = transitiondef.transition;
            return transition;
          }else{ //, otherwise create a new one
            if(transition == null){              
              if(lasttransition == null) {
                transition = selection.transition();
              }else{
                transition = lasttransition.transition();              
              }
            }
            transition.duration(default_duration);
            if(transitiondef.callback) transitiondef.callback(transition);
            if(! transitiondef.flags.match(/C/i)){ // C => "combined"
              break;
            }            
          }
        }
      }
    }
    if(transition != null){       
      lasttransition = transition; //keep it for making subtransitions from later.                
      transitiondef.transition = transition; //keep it for later reuse.
      return transition;
    }else{
      return selection;
    }
  }
  
  for(var i = 0, todo; todo = this._todo[i]; i++){
    switch (todo.type) {    
      case "text":
      case "call":
      case "each":{
        selection[todo.type](todo.value);
        break;
      }
      case "on":{
        selection[todo.type](todo.name,todo.value);
        break;
      }      case "style":  
        if(todo.value == "orange"){
          null;
        }
      case "attr":{
        var crud;
        if(fromview && fromview[todo.type](todo.name) != null){
          crud = "U";
        }else{
          crud = "C";
        }
        var sel2 = findtransitionselection(this._selector, todo.type, todo.name, crud)
        sel2[todo.type](todo.name,todo.value);        
        break;
      }
      case "view":{
        todo.value.drawinto(selection);
      }
      case "slot":{
        todo.value.drawinto(selection);
      }
    }
  }

  var fromchildren = fromview  ? clone(fromview._children) : [];
  for(var key in this._children){
    delete fromchildren[key];
    var child = this._children[key];    
    var childselection = select_or_create(selection, child._selector, child._data != null, child._data, child._data_key)    
    child.drawinto(childselection);
  }
  for(var key in fromchildren){
    selection.select(fromchildren[key].selector()).remove();
  }
  
  //console.debug(this._selector + " from-children left " + fromchildren.toString());
}


function select_or_create(parent, selector, multi, data, data_key) {
  if(selector[0] == "#" || selector[0] == ".")
    throw "select_or_create selector must not start with . or #";
  var id_sel, class_sel, element_sel;

  if(selector.split("#").length > 1) {
    a = selector.split("#");
    id_sel = a[1];
    element_sel = a[0];
  } else if(selector.split(".").length > 1) {
    a = selector.split(".");
    class_sel = a[1];
    element_sel = a[0];
  } else {
    element_sel = selector;
  }

  if(multi) {
    var newsel;
    if(!data) {
      newsel = parent.selectAll(selector);
      if(newsel.empty()) {
        newsel = parent.append(element_sel);
        if(id_sel)
          newsel.attr("id", id_sel);
        if(class_sel)
          newsel.attr("class", class_sel);
      }
    } else {
      if(data_key){
        newsel = parent.selectAll(selector).data(data, data_key);        
      }else{
        newsel = parent.selectAll(selector).data(data);
      }
      newsel.enter().append(element_sel);
      newsel.exit().remove();
      if(id_sel)
        newsel.attr("id", id_sel);
      if(class_sel)
        newsel.attr("class", class_sel);
    }

  } else {
    newsel = parent.select(selector);
    if(newsel.empty()) {
      newsel = parent.append(element_sel);
      if(id_sel)
        newsel.attr("id", id_sel);
      if(class_sel)
        newsel.attr("class", class_sel);
    }else{
      for(var i=0;i<newsel[0].length;i++){
        sel=newsel[0][i];
        if(sel==null){
          var ele = d3.select(parent[0][i]).append(element_sel)
          if(id_sel)
            ele.attr("id", id_sel);
          if(class_sel)
            ele.attr("class", class_sel);
        }
      }
      newsel = parent.select(selector);
    }   
  }

  return newsel;
}



function rectToArcTweenFactory(centre,initial_offset){        
  return function (d, i, a) {
    var path = d3.select(this);

            
    var c0 = [centre[0],initial_offset];
    var c1 = centre;
    var cNI= d3.interpolateArray(c0,c1);

    var p = d.rect.x - c1[0];
    var s = c1[1] - d.rect.y;
    var P0  = Math.atan(p/s);
    var P1  = d.arc.startAngle;
    var PNI = d3.interpolateNumber(P0,P1);
    
    var a0 = Math.sqrt(p*p + s*s);
    var a1 = d.arc.outerRadius;
    var aNI= d3.interpolateNumber(a0,a1);
    
    var W1 = d.arc.endAngle - d.arc.startAngle;
    var w0 = d.rect.width;
    var w1 = Math.sqrt(2*(a1*a1)*(1 - Math.cos(W1)));
    var wNI= d3.interpolateNumber(w0,w1);
    
    var h0 = d.rect.height;
    var h1 = d.arc.outerRadius - d.arc.innerRadius;
    var hNI= d3.interpolateNumber(h0,h1);
    
    var z0 = d.rect.x - c0[0];
    var z1 = d.arc.startAngle * a1;
    var zNI= d3.interpolateNumber(z0,z1); 
    
    var u0 = centre[1] - d.rect.y; 
    var u1 = d.arc.outerRadius;
    var uNI = d3.interpolateNumber(u0,u1); 

    /*           z (arc length)
     *        p ||     w
     *    *----tl*---__*tr  
     *    |    / |    /
     *   s|   /B |---_|h
     *    |  /   |t  /
     *    |P/a   |   |
     *    |/     |  /
     *  c1*C   c|   |c
     *    |\    |  /
     *    |Q\b  |  |
     *   r|  \  | /
     *    |   \A|W|
     *    |   R\|/
     *    ------*cN
     *       q
     *            *c0
     * 
     */        
    
    trigFn = function(z,u,cN,a,w,h){
      q = cN[0]-c1[0];
      r = cN[1]-c1[1];
      b = Math.sqrt((q*q)+(r*r));
      Q = q == 0 ? 0 : Math.atan(q / r);
      //C = Math.PI - Q - P;
      //R = Math.PI/2 - Q;
      //c = Math.sqrt((a*a) + (b*b) - 2 * a * b * Math.cos(C));
      c = cN[1] - c1[1] + u;
      //* cosC = a2 + b2 - c2 / 2ab
      //A = b == 0 ? P : Math.acos(((b*b) + (c*c) - (a*a))/(2*b*c));
      //startAngle = q == 0 ? A : R + A - Math.PI/2;
      //z = startAngle*c
      startAngle = z/c;
      //* a2=b2+c2- 2bc cosA
      //* w2=2c2- 2c2 cosW
      //* (2c2 - w2)/2c2
      endAngle = startAngle + Math.acos(1  - (w*w)/(2*(c*c)))
      return {
        startAngle:startAngle,
        endAngle:endAngle,
        outerRadius:c,
        innerRadius:c-h
      };
    }        

  
    return function(t) {
      t2 = Math.sin(t * Math.PI / 2);  
      t2 = Math.sin(t2 * Math.PI / 2);   
      //t2 = 

      //PN = PNI(t);
      cN = cNI(t2);
      a  = aNI(t);
      w  = wNI(t);
      h  = hNI(t);
      z  = zNI(t)
      u  = uNI(t)
      
      var f = trigFn(z,u,cN,a,w,h);
                
      path
      .attr("transform","translate(" + cN[0] + "," + cN[1] + ")")   
      .attr("d",arcer(f));    
    }
  }
}
