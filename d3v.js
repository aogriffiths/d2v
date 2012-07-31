//V1

function viewset(){
  this._views = {};
}

viewset.prototype.view = function(name, v) {
  if (arguments.length == 0)
    return this._views;
  if (arguments.length == 1)
    return this._views[name];
  this._views[name] = v;
  return this;
}

viewset.prototype.addnewview = function(name) {
  var v = new view();
  this.view(name,v);
  return v;
}

viewset.prototype.clonenewview = function(name, newname) {
  var v = this.view(name);
  v = v.clone();
  this.view(newname,v);
  return v;
}

function view(clonefrom) {
  if (!(this instanceof arguments.callee))
    return new view(); // allows dropping of the "new" keyword

  //Clone needs to handle these in a particular way
  this._parent_view = null; //TODO
  this._children  = clonefrom ? clone(clonefrom._children) : {};//TODO

  //Clone makes new copies of these
  this._selector    = clonefrom ? clone(clonefrom._selector)    : null;
  this._text        = clonefrom ? clone(clonefrom._text)        : null;
  this._attr        = clonefrom ? clone(clonefrom._attr)        : {};
  this._style       = clonefrom ? clone(clonefrom._style)       : {};
  this._each        = clonefrom ? clone(clonefrom._each)        : [];
  this._transitiondefs = clonefrom ? clone(clonefrom._transitiondefs) : [];
  this._cascade_transitiondefs = clonefrom ? clone(clonefrom._cascade_transitiondefs) : [];

  //Clone points to the same copies of these
  this._data        = clonefrom ? clonefrom._data               : null;
  this._selection   = clonefrom ? clonefrom._selection          : null;
}

view.prototype.data = function(data) {
  if (!arguments.length)
    return this._data;
  this._data = data;
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
  this._selector = selector;
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

view.prototype.attr = function(name, value) {
  if (arguments.length == 0)
    return this._attr;
  if (arguments.length == 1)
    return this._attr[name];

  this._attr[name] = value;
  return this;
}

view.prototype.style = function(name, value) {
  if (arguments.length == 0)
    return this._style;
  if (arguments.length == 1)
    return this._style[name];
  this._style[name] = value; 
  return this;
}

view.prototype.text = function(value) {
  if (arguments.length == 0)
    return this._text;

  this._text = value;
  return this;
}

view.prototype.each = function(value) {
  if (arguments.length == 0)
    return this._each;

  this._each.push(value); // TO CHECK
  return this;
}

view.prototype.elem = function(selector,uid) {
  var child;
  child = this._children[uid || selector];
  if (! child) {
    child = view().parent(this).selector(selector);
    this._children[uid || selector] = child
  }
  return child;
}

view.prototype.close = function() {
  return this._parent_view;
}

view.prototype.clone = function() {  
  return clone(this);
}

view.prototype.chart = function() {  
  var that = this;
  return function(selection){
    that.drawinto(selection);
  };
}

view.prototype.drawinto = function(parent_selection) {
  var selection;
  if(this._selector){
    selection = select_or_create(parent_selection, this._selector, this._data != null, this._data)
  }else{
    selection = parent_selection;
  }
  
  //get previous view
  var fromview;
  for(var i = 0; i < selection.length; i++){
    for(var j = 0; j < selection[i].length; j++){
       var ele =  selection[i][j];
       if(! fromview ) fromview = ele.__view__ //Take the first view as the from view, assume they are all the same
       ele.__view__ = this; //Set this as the view for all elements, the view can then be discovered from any element later on
    }
  }
  
  
/*
  if(transitioncallback != undefined && false){
    transitionselection = transitioncallback(selection);
  }else{
    transitionselection = selection;
  }
  */
  if(this._text != null){
    selection.text(this._text);
  }
  for(var i = 0, each; each = this._each[i]; i++){
    selection.each(each);
  }
  
  var transitiondefs = clone(this._transitiondefs)
  var lasttransition = null;
  
  function findtransitionselection(selector, type, name, crud){
    var itemid = selector + ":" + type + ":" + name;
    var transition = null;
    for(var i = transitiondefs.length-1; i>=0; i--){
      var transitiondef = transitiondefs[i];
      if(itemid.match(transitiondef.item_match)){
        if(crud.match(transitiondef.crud_match)){
          //Try to reuse a transitionselection from this transition
          if(transitiondef.transitionselection){
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
            transitiondef.callback(transition);
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
  
  for(var name in this._attr){
    var crud;
    if(fromview && fromview.attr(name) != null){
      crud = "U";
    }else{
      crud = "C";
    }
    findtransitionselection(this._selector, "attr", name, crud)
      .attr(name, this._attr[name]);
  }

  for(var name in this._style){
    var crud;
    if(fromview && fromview.style(name) != null){
      crud = "U";
    }else{
      crud = "C";
    }
    findtransitionselection(this._selector, "style", name, crud)
      .style(name, this._style[name]);
  }
  
  for(var key in this._children){
    var child = this._children[key];
    child.drawinto(selection);
  }
}


function select_or_create(parent, selector, multi, data) {
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
      newsel = parent.selectAll(selector).data(data);
      newsel.enter().append(element_sel);
      newsel.exit().remove();
      if(id_sel)
        newsel.attr("id", id_sel);
      if(class_sel)
        newsel.attr("class", class_sel);
    }

  } else {
    var newsel = parent.select(selector);
    if(newsel.empty()) {
      newsel = parent.append(element_sel);
      if(id_sel)
        newsel.attr("id", id_sel);
      if(class_sel)
        newsel.attr("class", class_sel);
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
