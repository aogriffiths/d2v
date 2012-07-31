/*!
 * d2v - Data Driven Visualisations JavaScript Library v0.1.1
 * 
 */

dv2 = {version: "0.1.0"};



function Cell() {
  this._data = null;
  this._dims = {};
  this._col = null; //parent CellCollection
}

Cell.prototype.data = function(data){
  if (!arguments.length) return this._data;
  this._data = data
  return this;
};

Cell.prototype.dim = function(dims){
  if (!arguments.length) return this._dims;
  this._dims = dims
  if(this._col){
    this._col.dims_changed(this,dims);
  }
  return this;
};


Cell.prototype.setDim = function(dim,value){
  this._dims[dim] = value;
  if(this._col){
    var a = {};
    a[dim] = value;
    this._col.dims_changed(this, a);
  }
  return this;  
};

Cell.prototype.getDim  = function(keys){
  if( ! (keys instanceof Array))  keys = [keys];
  var value = null;
  try{
    if(!keys[1]){
      value = this._dims[keys[0]];
    }else{
      value = this._dims[keys[0]][keys[1]];
    }
  }catch(e){
    
  }
  return value;  
};


Cell.prototype.col = function(col){
  if (!arguments.length) return this._col;
  this._col = col
  return this;
 };





function CellCollection(dataarray) {
  this.cells = [];
  this.dimsrange = {};
  if(dataarray) this.data(dataarray);
}

/**
 * Adds a Cell to the CellCollection
 * @param {Cell} cell  The Cell to add
 * @returns {CellCollection}
 */
CellCollection.prototype.addCell = function(cell){
  this.cells.push(cell);
  cell.col(this);
  return this;  
};

/**
 * Creates all cells for this collection from a data Array or another CellCollection
 * @param {Array or CellCollection} dataarray  The data to create the cells from
 * @returns {CellCollection}
 */
CellCollection.prototype.data = function(dataarray){
  if(dataarray instanceof CellCollection){
    this.cells = clone(dataarray.cells);
  }
  for(var i = 0, data; data = dataarray[i]; i++){
    var cell = new Cell().data(data);
    this.addCell(cell);
  }
  return this;  
};

/**
 * Arranges the cells
 * @param {Arrangement} arrangement  The Arranagment to use.
 * @returns {CellCollection}
 */
CellCollection.prototype.arrange = function(arrangement){
  arrangement.arrange(this);
  return this;  
};

/**
 * Projects the cells
 * @param {Projection} projection  The Projection to use.
 * @returns {CellCollection}
 */
CellCollection.prototype.project = function(projection){
  projection.project(this);
  return this;  
};

/**
 * Called when a part of the cells data changes
 * @param {Object} value  The new value
 * @param {String} nme    The name of the atribute that changed
 * @param {String} dim    The dim of the atribute that changed
 */
CellCollection.prototype.dims_changed = function(cell, dims){
  for(dim in dims){
    if(!this.dimsrange[dim]) this.dimsrange[dim] = [];
    this.dimsrange[dim][0] = MyMin(this.dimsrange[dim][0], dims[dim]);
    this.dimsrange[dim][1] = MyMax(this.dimsrange[dim][1], dims[dim]);
  }
}

function CombineArgArrays(){
  var all = [];
  for(var i = 0, total = 0; i < arguments.length; i++) {
    arg = arguments[i];
    if( arg instanceof Array){
      all = all.concat(arg)
    }else if(arg != undefined && arg != null){
      all.push(arg);
    }
  }
  return all;
}
function MyMax(){
  var all = CombineArgArrays.apply(this,arguments);   
  return Math.max.apply(Math,all);
}
function MyMin(){
  var all = CombineArgArrays.apply(this,arguments);   
  return Math.min.apply(Math,all);
}

/****************************************/
/* Arrangement 
/****************************************/

function Arrangement(turnoffdefaults) {
  //this._data=null;
  this._name=null;
  this._arrangementsDependantOn={};
  this.dimention={};
  this.turnoffdefaults = turnoffdefaults;
 /* Defauls:
    "x": Constant(0),
    "y": Constant(0),
    "dx": Constant(1),
    "dy": Constant(1)
  };
  */
  this.dimentionOrder = [];
  /*
  this._range={
    "x":[],
    "y":[]
  };
  this._nodes;
  this.needsrecalc = true;
  */
}

/*    
Arrangement.prototype.data = function(newdata) {
  if (!arguments.length) return this._data;
  this._data = newdata;
  needsrecalc = true;
  return this;
};
*/

Arrangement.prototype.name = function(newname){
  if (!arguments.length) return this._name;
  this._name = newname;
  return this;  
};

Arrangement.prototype.arrangementsDependantOn = function(newarrangementsDependantOn) {
  if (!arguments.length) return this._arrangementsDependantOn;
  this._arrangementsDependantOn = newarrangementsDependantOn;
  return this;
};

Arrangement.prototype.addArrangementDependantOn = function(dim,arrangement) {
  if (!arguments.length) return this._arrangementsDependantOn;
  this._arrangementsDependantOn[dim] = arrangement;
  return this;
};

Arrangement.prototype.getArrangementsDependantOnArray = function() {
  var a = [];
  for(i in this._arrangementsDependantOn){
    a.push(this._arrangementsDependantOn[i]);        
  }
  return a;
};

function funcToFactory(func){
    if(typeof func == "object"){
      //Already a factory
      return func;
    }else if(typeof func == "function"){
      //Is a function
      return {make:function(){return func}};           
    }else{
      //Is a constant
      return {make:function(){return function(){return func}}};     
    }
}

/**
 * dim sets the calculator function that will return the value for a named dimension of a cell.
 *  The parameter "func" is coerced into the calculator function using the following rules:
 *  - If func is a _constant_ the same value will be set for the dim for all cells
 *  - If func is a _function_ it is required to be function(cell,i) and will be called to cacluate the value for each cell.
 *  - If func is a _factory_ (i.e. an object with a make() function). make() is required to return a function(cell,i) which is then used to cacluate the value for each cell.
 * The factory approach is useful to allow the function(cell,i) to be recreated/reset before each collection of cells is calculated.
 * 
 * @param {String} dim  The name of the dimention
 * @param {func} func  The calculator function. See above.
 * @param {String} c  To be documented 
 * @param {Boolean} dontoverwrite  If true nothing will happen if the dim has already been set
 */
Arrangement.prototype.dim = function(dim,func,dontoverwrite) { 
  if(this._arrangementsDependantOn[dim]) delete this._arrangementsDependantOn[dim];
  if (!arguments.length){ 
    return this;
  }
  if (arguments.length == 1) {    
    return this.dimention[dim];
  }
  if (arguments.length >= 2) {
    if (arguments.length == 3 && dontoverwrite && this.dimention[dim]){
      //do nothing
    }else{
      if(func instanceof Array){
        for(var i = 0; i < func.length; i++){
          func[i] = funcToFactory(func[i]);
        }
        this.dimention[dim] = func
      }else {
        this.dimention[dim] = funcToFactory(func);
      }
      this.dimentionOrder.push(dim);
    } 
  }
  return this;
};



/**
 * Arranges an Array of data or a CellCollection of data
 * @param data {CellCollection || Array} the data to be arranged  
 * @returns {CellCollection} the original CellCollection or a new CellCollection, with the arrangement data added to it by this function.
 */
Arrangement.prototype.arrange = function(data){
  //TODO SORT and GROUPxx
  var collection = new CellCollection(data);
  var calculators = {};
  if(! this.turnoffdefaults){ 
    this.dim("i",  Increment(), true)
    this.dim("translate", Stringer("translate({x.0},{y.0})"), true)
    this.dim("width",     SubstractDims("x.1","x.0"), true)
    this.dim("height",    SubstractDims("y.1","y.0"), true)
  } 
 
  for(var dim in this.dimention){
    func = this.dimention[dim];
    if(func instanceof Array){
      calculators[dim] = [];
      for(var i = 0; i < func.length; i++){
        calculators[dim].push(func[i].make());
      }     
    }else{
      calculators[dim] = this.dimention[dim].make();
    }
  }
  //For each dimention 
  for(var j = 0, dim; dim = this.dimentionOrder[j]; j++){
    var calculator = calculators[dim];
    //for each cell
    for(var i = 0, cell; cell = collection.cells[i]; i++){
      var value;
      //For each array element
      if(calculator instanceof Array){
        value = [];
        for(var k = 0; k < calculator.length; k++){
          value.push(calculator[k].call(this, cell, i, dim, k));
          cell.setDim(dim, value);
        }
      }else{
        value = calculator.call(this, cell, i, dim);
        cell.setDim(dim, value);
      }
      
      
    }
  }
  return collection;
}




function CellCalculator() {}
CellCalculator.prototype.calc = function(cell,i){};


function CellCalculatorFactory() {}

/**
 * @return {CellCalculator}
 */
CellCalculatorFactory.prototype.make = function() {};


function Constant(value) {  
  if (!(this instanceof arguments.callee)) return new Constant(value); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this.value  = value  ? value  : 0;
}

Constant.prototype = new Constant();  // inherit CellCalculatorFactory  
Constant.prototype.constructor = Increment;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
Constant.prototype.make = function(){
  var that = this;

  return function(cell,i){
    return that.value;
  }
};

/**
 * Plus
 * @constructor
 * @return {Plus}
 */
function Plus(value) {  
  if (!(this instanceof arguments.callee)) return new Plus(value); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this.value  = value  ? value  : 1;
}

Plus.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
Plus.prototype.constructor = Plus;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
Plus.prototype.make = function(){
  var that = this;

  return function(cell, i, dim, j){
    return cell._dims[dim][j-1] + that.value;
  }
};


/**
 * Stringer
 * @constructor
 * @return {Stringer}
 */
function Stringer(value) {  
  if (!(this instanceof arguments.callee)) return new Stringer(value); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this.value = value  ? value  : "";
  var regex = /\{.*?\}/ig; 
  var allmatches = value.match(regex);
  this.toReplace = {};
  for(var i = 0, match; match = allmatches[i]; i++){
    var keys = match.replace("{","");
    keys = keys.replace("}","");
    keys = keys.split(".");
    this.toReplace[match] = keys;
  }
}

Stringer.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
Stringer.prototype.constructor = Stringer;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
Stringer.prototype.make = function(){
  var that = this;

  return function(cell, i, dim, j){
    res = that.value;
    for(replace in that.toReplace){
        var value = cell.getDim(that.toReplace[replace]);
        res = res.replace(replace,value);
    }
    return res;
  }
};


/**
 * SubstractDims
 * @constructor
 * @return {SubstractDims}
 */
function SubstractDims(a,b) {  
  if (!(this instanceof arguments.callee)) return new SubstractDims(a,b); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this._a = a.split(".");
  this._b = b.split(".");
}

SubstractDims.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
SubstractDims.prototype.constructor = SubstractDims;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
SubstractDims.prototype.make = function(){
  var that = this;

  return function(cell, i, dim, j){
    return cell.getDim(that._a) - cell.getDim(that._b);
  }
};


/**
 * Project
 * @constructor
 * @return {Stringer}
 */
function Project(from) {  
  if (!(this instanceof arguments.callee)) return new Project(from); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this._from = from ? from : null;
  this._to = null;
  this._gutter = [0,0];
}

Project.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
Project.prototype.constructor = Project;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
Project.prototype.make = function(){
  var that = this;
  var scale = null;

  return function(cell, i, dim, j){
    if(scale==null){
      var from_range;
      if(that._from instanceof Array){
        from_range = that._from;
      }else{
        from_range = cell.col().dimsrange[that._from];
      }
      scale = d3.scale.linear()
       .domain(from_range)
       .range(that._to);
    }
    from_dims = cell.getDim(that._from);
    to_dim = [];
    for(var i = 0; i < from_dims.length; i++){
      var from_dim = from_dims[i]
      var gutter = that._gutter[i];
      to_dim.push(scale(from_dim ) + gutter);
    }
    return to_dim;
  }
};

/**
 * to
 * @param {Array} to
 * @return {Project}
 */
Project.prototype.to = function(to){
  if (!arguments.length) return this._to;
  this._to = to;
  return this;
};

/**
 * from
 * @param {Array} from
 * @return {Project}
 */
Project.prototype.from = function(from){
  if (!arguments.length) return this._from;
  this._from = from;
  return this;
};

/**
 * gutter
 * @param {Array} from
 * @return {Project}
 */
Project.prototype.gutter = function(gutter){
  if (!arguments.length) return this._gutter;
  this._gutter = gutter;
  return this;
};




/**
 * Increment
 * @constructor
 * @return {Increment}
 */
function Increment(step, start) {  
  if (!(this instanceof arguments.callee)) return new Increment(step,start); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor  
  this.step  = step  ? step  : 1;
  this.start = start ? start : 0;
}  

Increment.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
Increment.prototype.constructor = Increment;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
Increment.prototype.make = function(){
  var that = this;
  var j;
  function init(){
    j = that.start - that.step;
  }
  init();
  return function(cell,i){
    if(i==0) init();
    j = j + that.step;
    return j;
  }
};

/**
 * Will return an integer starting ar "start", incrementing by "step" each time "field" changes.
 */
function IncrementOnChange(field, step, start) {  
  if (!(this instanceof arguments.callee)) return new IncrementOnChange(field, step, start); //allows dropping of the "new" keyword
  Increment.call(this, step, start);  // Call the parent constructor  
  this._field = field;
  that = this;
  this.field = (typeof field === "function") ? field : function(d,i) { 
    return d._data[that._field]; 
  };
}  

IncrementOnChange.prototype = new Increment();  // inherit CellCalculatorFactory  
IncrementOnChange.prototype.constructor = IncrementOnChange;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
IncrementOnChange.prototype.make = function(){
  var that = this;
  var j;
  var last_f;
  function init(){
    j = that.start - that.step;
    last_f = null;
  }
  init();
  return function(cell,i){
    if(i==0) init();
    if(last_f == null || last_f != that.field(cell)){
      j = j + that.step;
      last_f = that.field(cell)
    }
    return j;
  }
};

/**
 * Will return an integer starting ar "start", incrementing by "step" each time "field" changes.
 */
function IncrementOnUnique(field, step, start) {  
  if (!(this instanceof arguments.callee)) return new IncrementOnUnique(field, step, start); //allows dropping of the "new" keyword
  IncrementOnChange.call(this, step, start);  // Call the parent constructor  
}  

IncrementOnUnique.prototype = new IncrementOnChange();  // inherit CellCalculatorFactory  
IncrementOnUnique.prototype.constructor = IncrementOnUnique;        // correct the constuctor  

/**
 * @return {CellCalculator}
 */
IncrementOnUnique.prototype.make = function(){
  var that = this;
  var incrementors;
  var incrementFactory = new Increment(that.step, that.start);

  function init(){
    incrementors = {};
  }
  init();
  return function(cell,i){
    if(i==0) init();
    if (incrementors[that.field(cell)] == null) {
      incrementors[that.field(cell)] = incrementFactory.make();
    }    
    return incrementors[that.field(cell)](cell,i);
  }
};

/**
 * Will Sum two CellCalculators
 */
function SumFn(f1,f2) {  
  if (!(this instanceof arguments.callee)) return new SumFn(f1,f2); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor
  this.f1 = f1;
  this.f2 = f2;
}  

SumFn.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
SumFn.prototype.constructor = SumFn;        // correct the constuctor  


/**
 * @return {CellCalculator}
 */
SumFn.prototype.make = function(){
  var cc1 = this.f1.make();
  var cc2 = this.f2.make();
  
  return function(cell,i){
    return cc1(cell,i) + cc2(cell,i);
  }
};

/**
 * Will return an integer starting ar "start", incrementing by "step" each time "field" changes.
 */
function MultFn(f1,f2) {  
  if (!(this instanceof arguments.callee)) return new MultFn(f1,f2); //allows dropping of the "new" keyword
  SumFn.call(this);  // Call the parent constructor
}  

MultFn.prototype = new SumFn();  // inherit CellCalculatorFactory  
MultFn.prototype.constructor = MultFn;        // correct the constuctor  


/**
 * @return {CellCalculator}
 */
MultFn.prototype.make = function(){
  var cc1 = this.f1.make();
  var cc2 = this.f2.make();
  
  return function(cell,i){
    return cc1(cell,i) * cc2(cell,i);
  }
};



/*
vis.incrementBy = function vis_arrangement_distributeUniqueFor(field, s) {
  var f = typeof field === "function" ? field : function(d, i) { return d[field]; };
  var last = {};
  var step = (s != null ? s : 1);
  func = function(d,i){
    if (last[f(d)] == null) {
      last[f(d)] = 0;
    }else{
      last[f(d)] = last[f(d)] + step;
    }
    return last[f(d)];
  }
  return func;
}

function vis_arrangement_distributeD() {
  return 1;
}
*/

/****************************************/
/* vis.oldlib.spanalign
/****************************************/

function Allign() {  
  if (!(this instanceof arguments.callee)) return new Allign(); //allows dropping of the "new" keyword
  CellCalculatorFactory.call(this);  // Call the parent constructor
  this._toLayout = null;
  this._matchTo = null;
  this._matchFrom = null;
  this._dims = [];
}  

Allign.prototype = new CellCalculatorFactory();  // inherit CellCalculatorFactory  
Allign.prototype.constructor = SumFn;        // correct the constuctor  

/**
 * Set or Get the Layout to be alligned to
 * @param {Layout} toLayout  
 * @return {Allign}
 */
Allign.prototype.toLayout = function(toLayout) {
  if (!arguments.length) return this._toLayout;
  this._toLayout = toLayout;
  return this;
};

/**
 * Set or Get the dims to allign 
 * @param {Array} dims  A list of dims  
 * @return {Allign}
 */
Allign.prototype.dim = function(dim) {
  if (!arguments.length) return this._dim;
  this._dim = dim;
  return this;
};


/**
 * Set or Get the to data accessor to get the data that is being used to allign to
 * @param {function} matchFrom  A function that takes a cell and returns a data value  
 * @return {Allign}
 */
Allign.prototype.matchFrom = function(matchFrom) {
  if (!arguments.length) return this._matchFrom;
  this._matchFrom = matchFrom;
  return this;
};

/**
 * Set or Get the to data accessor to get the data that is being used to allign from
 * @param {function} matchTo  A function that takes a cell and returns a data value  
 * @return {Allign}
 */
Allign.prototype.matchTo = function(matchTo) {
  if (!arguments.length) return this._matchTo;
  this._matchTo = matchTo;
  return this;
};

/**
 * Set or Get the to data accessor to get the data that is being used to allign from
 * @param {function} matchTo  A function that takes a cell and returns a data value  
 * @return {Allign}
 */
Allign.prototype.dataAccessor = function(dataAccessor) {
  this._matchTo = dataAccessor;
  this._matchFrom = dataAccessor;
  return this;
};

/**
 * @return {Allign}
 */
Allign.prototype.make = function(){
  var that = this;
  var ranges = {};
  //The collection of cells being alligned to
  var collection = this._toLayout.cellCollection();
  for(var i = 0, cell; cell = collection.cells[i]; i++){  
    var toValue = this._matchTo(cell);
    var dim = this._dim;
    var dimValue = cell.dim()[dim];
    if(ranges[toValue] == null ) {
      ranges[toValue] = [];    
      ranges[toValue][0] = MyMin(dimValue);
      ranges[toValue][1] = MyMax(dimValue);
    }else{
      ranges[toValue][0] = MyMin(ranges[toValue][0], dimValue);
      ranges[toValue][1] = MyMax(ranges[toValue][1], dimValue);
    }
    
  }

  return function(cell,i){
    fromValue = that._matchFrom(cell);
    var res = [];
    if(fromValue instanceof Array){
      res[0] = MyMin(ranges[fromValue[0]]);
      res[1] = MyMax(ranges[fromValue[1]]);
    }else{
      res = ranges[fromValue];
    }
    return res;
  }
};


/**
 * Wraps an Objects method in a function that will cal it
 * @param {Object} that  The Object to call the function on.
 * @param {function} fn  The function to call.
 */
function wrap(that, fn) {
    return function() {
        return that[fn].apply(that, arguments);
    }
}

 
 
/****************************************
* Projection
****************************************/

function Projection() {
  this._autoscale = null;
  this._arrangement = [];
  this._scale  = {"x":null, "y":null}; //functions of 'd' and 'i'
  this._range  = {"x":null, "y":null}; //as above f(d,i)
  this._gutter = {"x":0,    "y":0   };
  this._translate = null;
  this._width = null;
  this._height = null;
  this.setupDeligates();
};

Projection.prototype.project = function(collection){
  return this;
};


Projection.prototype.clone = function(){
  var newP = clone(this);
  newP.setupDeligates();
  return newP;
};

Projection.prototype.arrangement = function(a) {
  if (!arguments.length) return this._arrangement;
  this._arrangement = [a];    
  return this;
};

Projection.prototype.domain = function(axis) {
  return this._arrangement[0].range(axis);
};


//TODO, add multiple arrangements, make the domain one that would cover all of them

/*
Projection.prototype.addarrangement = function(a) {
  if (!arguments.length || a == null) throw new Error("vis.oldlib.projection addarrangement requires a single argument 'arrangement'");
  arrangement.push(a);
  for(var i=0, lay; lay = arrangement[i]; i++){
    for(var j=0, b; b = ["x","y"][j]; j++){
      projection.scale(b).domain(arrangement[0].range(b));     
    }
  }
  return projection;
};
*/

// the range is a function of the node.
// a basic function retiurns the same range for all nodes
// a more complex example would be
// function(d,i){return lookuprangefor(d.group)};
Projection.prototype.range = function(axis,rangefunc) { //a is the axis, b is the new range to use for that axis.
  if (!arguments.length) return range;
  if (arguments.length == 1) return this._range[axis];
  this._range[axis] = d3.functor(rangefunc);
  return this;
};  

//TODO this is quite wastefull...
template_scalefunc = function(d,i){
  var new_scale = d3.scale.linear()
    .domain(  this.domain(a))   //lack of symetry (d,i) here...
    .range (  this.range(a)(d,i) );
  return new_scale;
};

/**
 * Scales are functions that take an input "domain" value and return an out put "range" value.
 * The projection can return a single scale for all data items or a different one.
 * e.g. scale = function(d,i){return lookupscalefor(d)};
 */ 
Projection.prototype.scale = function(axis,scale) { //a is the axis, b is the new scale to use for that axis.
  if (!arguments.length) return this._scale;
  if (arguments.length == 1) {      
    if(this._scale[axis]==null)  this._scale[axis] = template_scalefunc;
    return this._scale[axis];
  };
  this._scale[axis] = function(d,i){return this._scale};
  return this;
};

Projection.prototype.scalefunc = function(axis,scalefunc){
  if (arguments.length != 2)  throw new Error("scalefunc requires two arguments 'axis' and 'a scale function'");
  this._scale[axis] = scalefunc;
  return this;
};

Projection.prototype.gutter = function(axis,size) {
  if (!arguments.length) return this._gutter;
  if (arguments.length == 1) return this._gutter[axis];
  this._gutter[axis] = size;
  return this;
};    




/*********
 .     .
  1. .
   . .2
 .     .
**********/
/*
function freeze_func(object, function_name){
  return object[function_name]
}
*/

/**
 */ 
Projection.prototype.getScale = function(axis,d,i) {
  if(this._scale[axis] == null){
     var new_scale = d3.scale.linear()
       .domain(  this.domain(axis))   //lack of symetry (d,i) here...
       .range (  this.range(axis)(d,i) );
     return new_scale;
  }
  return this._scale[axis](d,i);
};

/**
 */ 
Projection.prototype.doscale = function(axis, d, i,domain_value) { 
  return this.getScale(axis,d,i)(domain_value);
}; 

Projection.prototype.setupDeligates = function(){
  this.x1 = wrap(this,"getx1");
  this.x2 = wrap(this,"getx2");
  this.y1 = wrap(this,"gety1");
  this.y2 = wrap(this,"gety2");
  this.translate = wrap(this,"gettranslate");
  this.width = wrap(this,"getwidth");
  this.height = wrap(this,"getheight");
};

//corner 1 x
Projection.prototype.getx1 = function(d,i) {
  return this.doscale("x", d, i, d.x) + this._gutter.x;
}
//corner 1 y
Projection.prototype.gety1 = function(d,i) {
  return this.doscale("y", d, i, d.y) + this._gutter.y;
}
//corner 2 x
Projection.prototype.getx2 = function(d,i) {
  return this.doscale("x", d, i, d.x + d.dx) - this._gutter.x;
}
//corner 2 y
Projection.prototype.gety2 = function(d,i) {
  return this.doscale("y", d, i, d.y + d.dy) - this._gutter.y;
}

/*
Projection.prototype.outsidecorner = function(a,n,d,i) {
  var v = d[a] + (n==2 ? d["d" + a] : 0)
  return projection.doscale(a, d, i, v);
}
*/
/*
Projection.prototype.getrange = function(a,d,i) {
  return [this.doscale(a, d, i, 1), this.doscale(a, d, i, 2)];
}
*/

Projection.prototype.gettranslate = function(d,i) {
  return "translate(" + this.getx1(d,i) + "," + this.gety1(d,i) + ")";
};

Projection.prototype.getwidth = function(d,i){
  return Math.max(this.getx2(d,i) - this.getx1(d,i),0);
};  

Projection.prototype.getheight = function(d,i){
  return Math.max(this.gety2(d,i) - this.gety1(d,i),0);
};
  


/*
vis.oldlib.projectionchain = function() {
  var projectionc = {},
      projections = [];

  projection.add = function(p){
    projections.push(p);
  };
  
  //*****************
  
  //corner 1 x
  projection.x1 = function(d,i) {
    return scale.x(d.x)+gutter.x;
  }
  //corner 1 y
  projection.y1 = function(d,i) {
    return scale.y(d.y)+gutter.y;
  }
  
  projection.translate = function(d,i) {
    return "translate(" + projection.x1(d,i) + "," + projection.y1(d,i) + ")"
  };
  projection.width = function(d,i){
    return scale.x(d.x + d.dx) - scale.x(d.x) - gutter.x*2;
  };
  
  projection.height = function(d,i){
    return scale.y(d.y + d.dy) - scale.y(d.y) - gutter.y*2;
  };
    
  return projectionc    
}
*/

/**
 * Layout
 */
function Layout() {
    this._data             =null; this._data_dirty       =true;
    this._arrangement      =null; this._arrangement_dirty=true;
    this._projection       =null; this._projection_dirty =true;
    this._sel              =null;
    this._cls              =null;
    this._name             =null;
    this._nodes            =null;
    this._shapes           ={};
    this._cellCollection;
}
  
Layout.prototype.data = function(newdata, idaccessor) {
  if (!arguments.length) return this._data;
  if (arguments.length > 0) this._data = newdata;
  if (arguments.length > 1) this._idaccessor = idaccessor;
  return this;
};

Layout.prototype.arrangement = function(newarrangement) {
  if (!arguments.length) return this._arrangement;  
  this._arrangement = newarrangement;
  if(newarrangement.name() == null){
    this._arrangement.name(this._name);
  }
  return this;
};

Layout.prototype.projection = function(newprojection) {
  if (!arguments.length) return this._projection;
  this._projection = newprojection;
  this._projection["parent_layout"] = this; 
  return this;
};

Layout.prototype.parentSelection = function(a) {
  if (!arguments.length) return this._sel;
  this._sel = a;
  return this;  
};

Layout.prototype.cls = function(newcls){
  if (!arguments.length) return this._cls;
  this._cls = newcls;
  return this;  
};

Layout.prototype.name = function(newname){
  if (!arguments.length) return this._name;
  this._name = newname;
  return this;  
};

Layout.prototype.cls_name = function(newname){
  this.cls(newname);
  this.name(newname);
  return this;  
};

 /**
 * A template transition callback
 * @param {CellCollection} cellCollection  A callba
 * @return {Layout}  
 */  
Layout.prototype.cellCollection = function(cellCollection){
  if (!arguments.length) return this._cellCollection;
  this._cellCollection = cellCollection;
  return this;  
};


 /**
 * A template transition callback
 * @param {String} name  The name of the shape (e.g. rect, circle, etc)
 * @param {String} cls   The class of the shape (as provided to the addShape method)
 * @param {String} callback  A callba
 * @return {Layout}  
 */  
Layout.prototype.addShape = function(name, cls, add_shape_callback){
  if(arguments.length == 2) {
    add_shape_callback = cls;
    cls = this.cls();
  } 
  
  this._shapes[name + "_" + cls] = {
    "name":name,
    "cls":cls,
    "callback":add_shape_callback
  };
  return this;
};

/**
 * A template ***add shape*** callback 
 * @param {Selection} shps_enter_trans  A d3 selection
 * @param {Selection} shps_enter_sel    A d3 selection
 * @return {null}  Shouldn't return anything
 */
template_add_shape_callback = function(shps_enter_trans, shps_enter_sel){return sel};

 /**
 * A template ***transition*** callback
 * @param {Selection} sel  A d3 selection
 * @param {String} shape_name  The name of the shape (e.g. rect, circle, etc)
 * @param {String} shape_cls   The class of the shape (as provided to the addShape method)
 * @param {String} tranition_type  can be "enter" (when new shapes are entering the drawing) or "move" (when existing shapes are being moved)
 * @return {null}  Must return a d3 selection (but this selection can be a transition selection made from the sel param)
 */
template_transition_callback = function(sel, shape_name, shape_cls, tranition_type){return sel};

 /**
 * A template transition callback
 * @param {String} sel  A d3 selection
 * @param {String} shape_name  The name of the shape (e.g. rect, circle, etc)
 * @param {String} shape_cls   The class of the shape (as provided to the addShape method)
 * @param {String} tranition_type  can be "enter" (when new shapes are entering the drawing) or "move" (when existing shapes are being moved)
 */
Layout.prototype.draw = function(transition_callback){
  
  transition_callback = transition_callback ? transition_callback : template_transition_callback;
  var collection = new CellCollection()
    .data(this._data)
    .arrange(this._arrangement);
  
  this.cellCollection(collection);
  
  var cells = this._sel.selectAll("g." + this._cls)
    .data(collection.cells, this._idaccessor ?  this._idaccessor : null);

  var cells_enter = cells.enter()
    .append("g")      
    .attr("class", this._cls);
  
  var cells_exit = cells.exit();
  //cells_exit = transition_callback(cells_exit, "g", cls, "exit");        
  cells_exit.remove();
    
  //var cells = this._sel.selectAll("g." + this._cls);
  cells2 = transition_callback(cells, "g", this._cls, "move");        
  cells2.attr("transform", function(cell,i){return cell._dims.translate});
  
  for(key in this._shapes){
    var shape = this._shapes[key];
    enterOrModify(shape, cells, transition_callback)
  }    
  return this;
};


Layout.prototype.remove = function(transition_callback){
  
  transition_callback = transition_callback ? transition_callback : template_transition_callback;
  
  var cells = this._sel.selectAll("g." + this._cls)
     .remove();

};

function enterOrModify(shape, cells, transition_callback){
    transition_callback = transition_callback ? transition_callback : template_transition_callback;
    var id = shape.name + "." + shape.cls;
    var shps_sel = cells.selectAll(id)
      .data( function (d){ return [d]; });
      
    var shps_enter_sel = shps_sel.enter()
      .append(shape.name)
      .attr("class", shape.cls);
      
    shps_enter_trans = transition_callback(shps_enter_sel, shape.name, shape.cls, "enter");        
    shape.callback(shps_enter_trans, shps_enter_sel, this);

    shps_trans = transition_callback(shps_sel, shape.name, shape.cls, "move");        
    shape.callback(shps_trans,shps_sel,this);
}

/**
 * Creates an instance of Drawing.
 *
 * @constructor
 * @param {String} nme  The name to give the drawing, currently not used but handy for debugging.
 */
function Drawing(nme) {
  this.layouts = [];
  this.layouts_by_name = {};
  this._nme = nme ? nme : "";
};

/**
 * Names the Drawing, currently not used but handy for v.
 * @param {String} nme  The name to give the Drawing.
 * @return {Drawing}
 */
Drawing.prototype.nme = function(nme){
  if (!arguments.length) return this._nme;
  this._nme = nme ? nme : "";
  return this;
};


/**
 * Adds a layout to a drawing 2
 * @this {Drawing}
 * @param {Layout} layout  The Layout to snapshop
 * @param {String} nme  The name to give the layout, within the Drawing.
 * @param {array} data 
 * @param {Arrangement} arrangement
 * @param {Projection} projection
 * @param {array} arrangementsDependantOn
 * @param {function} shapescallback  A callback function (Not currently used? //TODO)
 * @return {Drawing}
 */
Drawing.prototype.addLayout = function(layout,nme,data,arrangement,projection,arrangementsDependantOn,shapescallback){
  var layoutdef = {
    "name":nme,
    "layout":layout,
    "data":data,
    "arrangement":arrangement,
    "projection":projection,
    "arrangementsDependantOn":arrangementsDependantOn,
    "shapescallback":shapescallback
  };
  this.layouts.push(layoutdef);
  this.layouts_by_name[nme] = layoutdef;
  return this;
};

/**
 * Names the Drawing, currently not used but handy for debugging.
 * @param {String} nme  The name to give the Drawing.
 * @return {Drawing}
 */
Drawing.prototype.layoutByName = function(nme){
  if      (!arguments.length     ) return this.layouts_by_name;
  else if ( arguments.length == 1) return this.layouts_by_name[nme];
};

  
/**
 * Snapshots a Layout by deep copying its setup
 * @param {Layout} layout  The Layout to snapshop
 * @param {String} nme  The name to give the layout, within the Drawing.
 * @param {function} shapescallback  A callback function (Not currently used? //TODO)
 * @returns {Drawing}
 */
Drawing.prototype.snapshotLayout = function(layout,nme,shapescallback){
  nme = nme ? nme : layout.name();
  this.addLayout(layout, nme, layout.data(), layout.arrangement(), layout.projection(), layout.arrangement().getArrangementsDependantOnArray(), shapescallback)
  return this;
};

/**
 * Clones this Drawing, deep copying it's data'
 * @returns {Drawing}
 */
Drawing.prototype.clone = function(){
  return clone(this);
};

/**
 * Clones this Drawing, deep copying it's data'
 * @param {function} transition_callback  A callback function, if it i provided it is called. see template_transition_callback
 * @param {function} shapescallback  A callback function (Not currently used? //TODO)
 * @returns {Drawing}
 */
Drawing.prototype.draw = function(transition_callback, fromdrawing, svg){
  old_layouts = {};
  if(fromdrawing) old_layouts = clone(fromdrawing.layoutByName());
  for(var i = 0, layoutdef; layoutdef = this.layouts[i]; i++){
      if(old_layouts[layoutdef.name]){
        delete old_layouts[layoutdef.name];
      }
      var layout = layoutdef.layout;

      layout.data(layoutdef.data);
      layout.arrangement(layoutdef.arrangement);
      if(svg) layout.parentSelection(svg);
      
      layout.draw(transition_callback);
  }
  for(key in old_layouts){
    var layout = old_layouts[key].layout;
    layout.remove(transition_callback);
  }
};

function clone(oldObject){
  if(oldObject instanceof Array){
    return jQuery.extend(true, [], oldObject);    
  }else{
    return jQuery.extend(true, {}, oldObject);
  }
}

function quickdeepcopy(a){
  var a2 = {};
  for (var i in a)
    a2[i] = a[i];
  return a2;
}

function copyinto(tomap, frommap){
  for(key in frommap){
    tomap[key] = frommap[key];
  }
}







/**
 * Creates an instance of Thing.
 *
 * @constructor
 * @param {String} aa  A name
 * @this {Thing}
 */
function Thing(aa){
  this.a = "";
}


/**
* Concatonates b with a
* @param {String} b  A name to display with greeting.
* @return {String} cool  Returns a string value containing name and greeting
*/

Thing.prototype.m = function(b){
  return this.a + b;
}
var d = new Thing("a");
d.m("b");

var d = new Drawing();
d.addLayout


function WordWraper(textaccessor) {
  if (!(this instanceof arguments.callee)) return new WordWraper(textaccessor); //allows dropping of the "new" keyword
  this._textaccessor = textaccessor;
}

/**
 * Set or Get the textaccessor
 * @param {function} toLayout  
 * @return {WordWraper}
 */
WordWraper.prototype.textaccessor = function(textaccessor) {
  if (!arguments.length) return this._textaccessor;
  this._textaccessor = textaccessor;
  return this;
};

/**
 * Set or Get the height
 * @param {Number} height  
 * @return {WordWraper}
 */
WordWraper.prototype.height = function(height) {
  if (!arguments.length) return this._height;
  this._height = d3.functor(height);
  return this;
};

/**
 * Set or Get the width
 * @param {width} width  
 * @return {Number}
 */
WordWraper.prototype.width = function(width) {
  if (!arguments.length) return this._width;
  this._width = d3.functor(width);
  return this;
};


WordWraper.prototype.make = function() {
  that = this;
  return function (d, i) {
        if(that._textaccessor){
          var words = that._textaccessor(d).split(' ');
        }else{
          if( this.lastChild){
          var words = d3.select(this).select(
            function() {
              return this.lastChild;
            }).text().split(' ');
          }else{
            var words = [""];
          }
        }
        var line       = new Array();
        var lines      = new Array();
        var length     = 0;
        var text       = "";
        var width      = that.width()  ? that.width()(d)  : d.dim().width;
        var height     = that.height() ? that.height()(d) : d.dim().height;
        var lineheight = 11;
        var maxlines   = Math.floor(height / lineheight);
        var word;
        var sel        = d3.select(this);
        var _x         = sel.attr("x") || 0;
        var _y         = sel.attr("y") || 0;
        sel.attr("x",null);
        sel.attr("y",null);
        var firstline = true;
        for(var i = 0, word; word = words[i]; i++){ //For each word
          line.push(word);                          //append it to the current line
          var islastword = (i + 1 == words.length);
          if(!islastword)                                              // if there are still more words left;
            this.firstChild.data = line.join(' ') + " " + words[i+1];  // try the line, with one more word
          else
            this.firstChild.data = line.join(' ');                     // else try the line as is.
                        
          length = this.getBBox().width;       //what wdith does that line give us?
          
          if(width < length || islastword) {   //if it's either too long with the extra word, or there are no more words left 
            text = line.join(' ');             //use the line as is (without the extra word)
            this.firstChild.data = text;       
            if(this.getBBox().width > width) { //This will happen if there is only one word, which is still longer than the space available
              if(! lines[lines.length-1] ) lines.push("");
              lines[lines.length-1] += "...";  //if so append elipses to the previous line (or line 0 if there is no previous line)
              break;                           //and break, no need to try adding more words
            }else if(text != '') {             //if text is not blank add it in as a tspan. 
              lines.push(text);
            }

            line = new Array();
            firstline = false;
          }
        } 
        var actuallines = Math.min(maxlines, lines.length);
        var startdy = (actuallines-1)*0.5*lineheight;
        for(var i = 0, line; line = lines[i]; i++){
          if(i == maxlines) break;
          if(i == maxlines - 1 && i < lines.length -1) line += "...";
          //console.debug(line);
          this.getBBox().width; //seems to trigger the rendering to work properly in chrome..
          var tspan = d3.select(this).append("svg:tspan")
            .attr("x", _x)
            .text(line);
          if(i==0){
            tspan.attr("y", _y);
            tspan.attr("dy", -startdy);                
          }else{
            tspan.attr("dy", lineheight);                
          }
          
        }
        if(this.firstChild){
          this.firstChild.data = '';
        }
        //console.debug("__");
      }
  
};

/**
 * RelateMatrix
 * spans = [span*]
 * span  = {"data": b,
 *          "hits": [hit*],
 *          "gaps": [gap*]}
 * Where: data is a B data item, 
 *        hits are continuous ranges of A data items that have a link to the B item.
 *      & gaps are continuous ranges of A data items that sit between the hits.
 * 
 * hit / gap = {"data":[ a(0..1)],
 *              "i"   :[ai(0..1)]}
 * 
 * Where: data is a pair of A data items data[0] being the first data[1] being the last.
 *        i    is a pair of A data item indexes i[0] being the first i[1] being the last.
 *   
 * e.g:
 * 
 *  [{"data": b,
 *    "hits": [{
 *       "data":[a0,  a1 ],
 *       "i"   :[ai0, ai1] }],
 *    "gaps": [{
 *       "data":[a0,  a1 ],
 *       "i"   :[ai0, ai1] }],
 *   }]
 */
function RelateMatrix() {  
  if (!(this instanceof arguments.callee)) return new RelateMatrix(); //allows dropping of the "new" keyword
}  


/**
 * Set or Get 
 * @param {Object} a  
 * @return {Object}
 */
RelateMatrix.prototype.a = function(a) {
  if (!arguments.length) return this._a;
  this._a = a;
  return this;
};

/**
 * Set or Get seriesA 
 * @param {Array} a  An array of sorted A data (e.g. "horizontal") 
 * @return {RelateMatrix}
 */
RelateMatrix.prototype.seriesA = function(a) {
  if (!arguments.length) return this._seriesA;
  this._seriesA = a;
  return this;
};

/**
 * Set or Get seriesB 
 * @param {Array} a  An array of sorted B data (e.g. "vertical") 
 * @return {RelateMatrix}
 */
RelateMatrix.prototype.seriesB = function(a) {
  if (!arguments.length) return this._seriesB;
  this._seriesB = a;
  return this;
};

/**
 * Set or Get links
 * @param {Object} links  An array of links from the A's to the B's
 * @return {Object}
 */
RelateMatrix.prototype.links = function(links) {
  if (!arguments.length) return this._links;
  this._links = links;
  return this;
};

/**
 * Set or Get the A link accessor function
 * @param {function} linkaccessorA  A function that reterns an A id, when given a link
 * @return {Object}
 */
RelateMatrix.prototype.linkaccessorA = function(linkaccessorA) {
  if (!arguments.length) return this._afn;
  this._afn = linkaccessorA;
  return this;
};


/**
 * Set or Get the B link id accessor function
 * @param {function} linkaccessorB  A function that reterns a B id, when given a link
 * @return {Object}
 */
RelateMatrix.prototype.linkaccessorB = function(linkaccessorB) {
  if (!arguments.length) return this._bfn;
  this._bfn = linkaccessorB;
  return this;
};

/**
 * Set or Get the A id accessor function
 * @param {function} linkaccessorA  A function that reterns an A id, when given an A object
 * @return {Object}
 */
RelateMatrix.prototype.idaccessorA = function(idaccessorA) {
  if (!arguments.length) return this._idaccessorA ? this._idaccessorA : function(item){return item.Id};;
  this._idaccessorA = idaccessorA;
  return this;
};


/**
 * Set or Get the B id accessor function
 * @param {function} linkaccessorB  A function that reterns a B id, when given a B object
 * @return {Object}
 */
RelateMatrix.prototype.idaccessorB = function(idaccessorB) {
  if (!arguments.length) return this._idaccessorB ? this._idaccessorB : function(item){return item.Id};;
  this._idaccessorB = idaccessorB;
  return this;
};

/**
 * calculate
 * @return {Object} A list of the relationships (See overall documentation for RelateMatrix);
 */
RelateMatrix.prototype.calculate = function(){ 
  var as    = this._seriesA,
      bs    = this._seriesB, 
      links = this._links,
      afn   = this._afn,
      bfn   = this._bfn;
      
  idA = this.idaccessorA();
  idB = this.idaccessorB();
  links_by_a={}
  for(var i=0,link;link=links[i];i++){
    var a = afn(link);
    if(! links_by_a[a] ) links_by_a[a] = [];
    links_by_a[a].push(bfn(link));     
  }
  spans=[];
  //For each "row"
  for(var ib=0,b;b=bs[ib];ib++){
    min=null;
    max=null;
    span = {
      "data": b,
      "hits": [],
      "gaps": []
    }
    //For each "column"
    var prev_linked = false; 
    var hit=null;
    var gap=null;
    for(var ia=0,a;a=as[ia];ia++){
      //is this "column" linked to this "row"? Assume not and check to find if it is...
      var this_linked = false; 
      if(links_by_a[idA(a)]){
        for(var ib2=0,idb2;idb2=links_by_a[idA(a)][ib2];ib2++){
          if(idB(b) == idb2) {
            this_linked = true;
            break;
          }
        }
      }
      if(this_linked){ // if a is linked to b
        if(!prev_linked){ // it's the start of a hit
          hit = {"data":[],"i":[]};
          hit.data[0] = a;
          hit.i[0]    = ia;
          span.hits.push(hit);
          if(gap){
            span.gaps.push(gap);
          }
        }
        hit.data[1] = a;
        hit.i[1]    = ia;        
      }
      if(!this_linked){
        if(prev_linked){
          gap = {"data":[],"i":[]};
          gap.data[0] = a;
          gap.i[0]    = ia;
        }
        if(gap){
          gap.data[1] = a;
          gap.i[1]    = ia;
        }
      }
      prev_linked = this_linked;
    }
    spans.push(span);
  }
  return spans;
}

RelateMatrix.prototype.flatten = function(spans){
  var hits = [];
  var gaps = [];
  var pos = 0;
  for(var i = 0, row; row = spans[i]; i++){
    for(var j = 0, hit; hit = row.hits[j]; j++){
      if(row.pos != null && row.pos != undefined) pos = row.pos;
      res = {
        "Id":row.data.Id + "_hit_" + j,
        "row":row.data,
        "pos":pos,
        "left":hit.data[0],
        "right":hit.data[1]
      }
      pos++;
      hits.push(res);
    }    
    for(var j = 0, gap; gap = row.gaps[j]; j++){
      if(row.pos != null && row.pos != undefined)pos=row.pos;
      res = {
        "Id":row.data.Id + "_gap_" + j,
        "row":row.data,
        "pos":pos,
        "left":gap.data[0],
        "right":gap.data[1]
      }
      pos++;
      gaps.push(res);
    }    
  }
  return {"hits":hits, "gaps":gaps};
}

RelateMatrix.prototype.pack = function(spans){
  var ress = [];
  var starts_at =[];
  var max_max_right = 0;
  for(var i = 0, row; row = spans[i]; i++){
    var min_left  = 99999; //TODO, this is a bit of a hack.
    var max_right = 0;
    for(var j = 0, hit; hit = row.hits[j]; j++){
      min_left  = Math.min(min_left,  hit.i[0]);
      max_right = Math.max(max_right, hit.i[1]);
    }
    max_max_right = Math.max(max_right, max_max_right);
    row.width = max_right - min_left + 1;
    row.min_left = min_left;
    row.max_right = max_right;
    if(!starts_at[min_left]) starts_at[min_left] = [];
    starts_at[min_left].push(row);
  }
  for(var i = 0; i < starts_at.length; i++){
    rows = starts_at[i];
    if(rows){
      rows.sort(sortbywidth);
      rows.reverse();
    }
  }
  spans2 = [];
  var i = 0;
  while(!isEmpty(starts_at)){
    var j = 0;
    while(j <= max_max_right){
      var row = findnextrow(j,starts_at);
      if(row){
        //console.debug(i + ":" + row.data.Name + " " + row.min_left + " + " + row.width );
        row.pos = i;
        spans2.push(row);
        j = row.max_right+1;;
      }else{
        j = max_max_right+1;
      }
    }
    i++;
  }
  this.max_pos = i;
  return spans2;
  
}
/**
 * basicHitBlocks
 * @returns {Array}  A list of hit blocks 
 */
RelateMatrix.prototype.basicHitBlocks = function(gap_hit){
  var spans = this.calculate();
  var blocks = this.flatten(spans);
  return blocks.hits;
}
/**
 * packedHitBlocks
 * @returns {Array}  A list of hit blocks 
 */
RelateMatrix.prototype.packedBlocks = function(gap_hit){
  var spans = this.calculate();
  var spans2 = this.pack(spans,gap_hit)
  var blocks = this.flatten(spans2);
  return blocks;
}



function EAView(){
  if (!(this instanceof arguments.callee)) return new EAView(); //allows dropping of the "new" keyword
}

EAView.prototype.name = function(name){
  if (!arguments.length) return this._name;
  this._name = name;
  return this;  
}

EAView.prototype.draw = function(){
  
}

function InheritsEAView(){
	if (!(this instanceof arguments.callee)) return new InheritsEAView(); //allows dropping of the "new" keyword
	EAView.call(this);  // Call the parent constructor  
}

InheritsEAView.prototype = new EAView();                 // inherit EAView  
InheritsEAView.prototype.constructor = InheritsEAView;   // correct the constructor  
	

function findnextrow(from,starts_at){
  for(var i = from; i < starts_at.length; i++){
    rows = starts_at[i]
    if(rows){
      row = rows.shift();
      if(rows.length == 0) starts_at[i] = undefined;
      return row;
    }
  }
}

function sortbywidth(a, b){
return (a.width - b.width) //causes an array to be sorted numerically and ascending
}
function sortbyalphabetical(a, b)
{
     var A = a.toLowerCase();
     var B = b.toLowerCase();
     if (A < B){
        return -1;
     }else if (A > B){
       return  1;
     }else{
       return 0;
     }
}

function isEmpty(arr) {
   for(var i =0; i<arr.length; i++) {
      if (arr[i])  return false;
   }
   return true;
}