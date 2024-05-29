//https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-overview/light-transport-ray-tracing-whitted
//https://docs.google.com/spreadsheets/d/1ClkbojsvQ1bFL30ACCArCdO8WA5KplhBReCRxTEm01E/edit#gid=0

var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
var width;
var height;
var base = 16;
var maxd = 1000;
var maxb = 3;
var objs = []
var objects = [];
var holes = [];
var push;
var lv;
var cam = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 1.5, fov: 150 };
var background = [100, 100, 100];
var shadow = 10;
var bounds;
var raycount = [0, 0, 0];
var raymode = "msaa";
var calc = { px: "", py: "" };

function onOpen() {
  SpreadsheetApp.getUi().createMenu("Raycaster").addItem("Menu", "edit").addItem("Hue Map", "huemap").addSeparator().addItem("Debug Spot", "debugspot").addItem("Run GS", "rungs").addToUi();
}

function rungs() {
  try {
    var input = Browser.inputBox("Enter GS");
    console.log("Running script: " + input);
    var op = eval(input);
    console.log("Finished: " + op);
    Browser.msgBox(op);
  } catch (e) {
    var msg = e.stack.split(")");
    msg = msg.join(")\\n");
    var m = "Failed! " + e.name + ":" + e.message + "\\n Stack Trace:\\n" + msg;
    Browser.msgBox(m);
    console.error(m);
  }
}

var vector = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;

  this.normalize = function () {
    return new vector(0, 0, 0).set(normVec(this.x, this.y, this.z));
  }

  this.add = function (v) {
    return new vector(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  this.sub = function (v) {
    return new vector(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  this.mult = function (v) {
    return new vector(this.x * v.x, this.y * v.y, this.z * v.z);
  }

  this.multN = function (x, y, z) {
    return new vector(this.x * x, this.y * y, this.z * z);
  }

  this.dot = function (v) {
    return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
  }

  this.get = function () {
    return { x: this.x, y: this.y, z: this.z };
  }

  this.clone = function () {
    return new vector(this.x, this.y, this.z);
  }

  this.set = function (v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  this.setN = function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  this.string = function () {
    return "{ x: " + this.x + ", y: " + this.y + ", z: " + this.z + " }";
  }

  this.round = function () {
    var p = 1000;
    return new vector(Math.round(this.x * p) / p, Math.round(this.y * p) / p, Math.round(this.z * p) / p);
  }

  this.copy = function () {
    return new vector(this.x, this.y, this.z);
  }
}

var object = function (x, y, z, sizex, sizey, sizez, color, type, data1, mat, data2) {
  this.pos = new vector(x, y, z);
  this.dep = new vector(sizex, sizey, sizez);
  this.color = color;
  this.type = type;
  this.data1 = data1;
  this.mat = mat + "";
  this.data2 = data2;

  this.string = function () {
    return "{ pos: " + this.pos.string() + ", dep: " + this.dep.string() + ", type: " + this.type + ", color: " + this.color + ", mat: " + this.mat + " }";
  }

  this.savestring = function () {
    return "&" + this.pos.x + "|" + this.pos.y + "|" + this.pos.z + "|" + this.dep.x + "|" + this.dep.y + "|" + this.dep.z + "|" + this.color + "|" + this.type + "|" + this.data1 + "|" + this.mat + "|" + this.data2;
  }

  this.getNormal = function (p) {
    var nor = { x: 0, y: 0, z: 1 };

    switch (this.type) {
      case "sphere":
        nor = new vector(p.x - this.pos.x, p.y - this.pos.y, p.z - this.pos.z);
        break;
      default:
        var t = 5;
        var h = (t - 1) / 2;
        var s = 100;
        var xa = 0;
        var ya = 0;
        var za = 0;
        for (var j = -h; j <= h; j++) {
          for (var k = -h; k <= h; k++) {
            for (var l = -h; l <= h; l++) {
              if (this.testin(p.x + (j / s), p.y + (k / s), p.z + (l / s))) {
                xa += j;
                ya += k;
                za += l;
              }
            }
          }
        }
        nor = { x: -xa, y: -ya, z: -za };
        break;
      case "box":
        nor = { x: 0, y: 0, z: 0 };
        var xp = Math.abs(p.x - this.pos.x) / this.dep.x;
        var yp = Math.abs(p.y - this.pos.y) / this.dep.y;
        var zp = Math.abs(p.z - this.pos.z) / this.dep.z;
        var changed = false;
        if (xp > yp && xp > zp) {
          if (p.x - this.x > 0) {
            nor.x = 1;
          } else {
            nor.x = -1;
          }
          changed = true;
        }
        if (yp > xp && yp > zp && !changed) {
          if (p.y - this.y > 0) {
            nor.y = 1;
          } else {
            nor.y = -1;
          }
          changed = true;
        }
        if (zp > yp && zp > xp && !changed) {
          if (p.z - this.z > 0) {
            nor.z = 1;
          } else {
            nor.z = -1;
          }
        }
        break;
    }

    return new vector(0, 0, 0).set(nor).normalize();
  }

  this.testin = function (px, py, pz) {
    var hdx = this.dep.x / 2.0;
    var hdy = this.dep.y / 2.0;
    var hdz = this.dep.z / 2.0;
    var x = this.pos.x;
    var y = this.pos.y;
    var z = this.pos.z;
    switch (this.type) {
      case "sphere":
        return (Math.pow((x - px) / hdx, 2) + Math.pow((y - py) / hdy, 2) + Math.pow((z - pz) / hdz, 2)) < 1;
        break;
      case "pyramid":
        return false;
        break;
      case "box":
        return (((x - hdx < px) && (int(x) + hdx > px)) && ((y - hdy < py) && (int(y) + hdy > py)) && ((z - hdz < pz) && (int(z) + hdz > pz)));
        break;
      case "formula":
        return eval(this.data1);
        break;
      case "d8":
        return ((abs(x - px) / hdx) + (abs(y - py) / hdy) + (abs(z - pz) / hdz)) <= 1;
        break;
      case "quadec":
        return (((x - hdx < px) && (int(x) + hdx > px)) && ((y - hdy < py) && (int(y) + hdy > py)) && ((z - hdz < pz) && (int(z) + hdz > pz))) && (((abs(x - px) / this.dep.x) + (abs(y - py) / this.dep.y) + (abs(z - pz) / this.dep.z)) < 1);
        //(((x - hdx < px) && (int(x) + hdx > px)) && ((y - hdy < py) && (int(y) + hdy > py)) && ((z - hdz < pz) && (int(z) + hdz > pz))) && (((abs(x - px) / this.dep.x) + (abs(y - py) / this.dep.y) + (abs(z - pz) / this.dep.z)) < 0.7);
        break;
      case "cylinder":
        switch (this.data1) {
          default:
          case "x":
            return ((x - hdx < px) && (int(x) + hdx > px)) ? ((Math.pow((y - py) / hdy, 2) + Math.pow((z - pz) / hdz, 2)) < 1) : (false);
          case "y":
            return ((y - hdy < py) && (int(y) + hdy > py)) ? ((Math.pow((x - px) / hdx, 2) + Math.pow((z - pz) / hdz, 2)) < 1) : (false);
          case "z":
            return ((z - hdz < pz) && (int(z) + hdz > pz)) ? ((Math.pow((y - py) / hdy, 2) + Math.pow((x - px) / hdx, 2)) < 1) : (false);
        }
        break;
    }
    return false;
  }
}

var ray = function (x, y, z, vx, vy, vz, px, py, mode) {
  this.pos = new vector(x, y, z);
  this.vel = new vector(vx, vy, vz).normalize().multN(0.8, 0.8, 0.8);
  this.cel = new vector(px, py, 0);
  this.dep = 1;
  this.fdep = 0;
  this.mode = mode;
  this.color = [0, 0, 0];
  this.bounce = 0;
  this.create;

  this.update = function () {
    switch (this.mode) {
      case "msaa":
        this.vel.set(this.vel.normalize().multN(0.5, 0.5, 0.5));
        this.pos.set(this.pos.add(this.vel));
        var pho = null;
        var inhole = false;
        var wasinbounds = false;
        while (this.dep < maxd) {
          if (bounds.testin(this.pos.x, this.pos.y, this.pos.z)) {
            wasinbounds = true;
            this.dep += 1;
            this.fdep += 1;
            this.pos.set(this.pos.add(this.vel));
            colany = false;
            var col = this.colAny();
            if (col.hole.hol != null) pho = col.hole.hol;
            if (col.in && col.hol == null && !col.hole.in) {// && (col.obj.mat != "mirror" && col.obj.mat != "glossy")) {
              this.pos.set(this.pos.sub(this.vel.multN(10, 10, 10)));
              var cdat = [0, 0, 0];
              var sray;
              var msd = 0.5;
              if (col.obj.mat != "mirror" && col.obj.mat != "glossy") {
                var sray = new ray(this.pos.x, this.pos.y, this.pos.z, this.vel.x, this.vel.y, this.vel.z, this.cel.x, this.cel.y, "primary");
                sray.dep = this.dep;
                sray.fdep = this.fdep;
                sray.update();
                cdat[0] += push[int(this.cel.x)][int(this.cel.y)][0] * 2;
                cdat[1] += push[int(this.cel.x)][int(this.cel.y)][1] * 2;
                cdat[2] += push[int(this.cel.x)][int(this.cel.y)][2] * 2;
                for (var v = 0; v < 4; v++) {
                  var sray = new ray(this.pos.x + ((v < 2) ? (-msd) : (msd)), this.pos.y + ((v > 0 && v < 2) ? (-msd) : (msd)), this.pos.z, this.vel.x, this.vel.y, this.vel.z, this.cel.x, this.cel.y, "primary");
                  sray.dep = maxd - ((10 / 0.5) + 30);
                  sray.fdep = this.fdep;
                  sray.update();
                  cdat[0] += push[int(sray.cel.x)][int(sray.cel.y)][0];
                  cdat[1] += push[int(sray.cel.x)][int(sray.cel.y)][1];
                  cdat[2] += push[int(sray.cel.x)][int(sray.cel.y)][2];
                }
                cdat[0] = int(cdat[0] / 6);
                cdat[1] = int(cdat[1] / 6);
                cdat[2] = int(cdat[2] / 6);
                push[int(this.cel.x)][int(this.cel.y)] = cdat;
              } else {
                var sray = new ray(this.pos.x, this.pos.y, this.pos.z, this.vel.x, this.vel.y, this.vel.z, this.cel.x, this.cel.y, "primary");
                sray.dep = this.dep;
                sray.fdep = this.fdep;
                sray.update();
              }
              this.dep = maxd;
              return;
            }
          } else {
            this.dep += 1;
            this.fdep += 1;
            this.pos.set(this.pos.add(this.vel));
            if (wasinbounds) {
              this.dep = maxd + 1;
              this.fdep = this.dep;
              return;
            }
          }
        }
        break;
      case "primary":
        this.vel.set(this.vel.normalize().multN(0.5, 0.5, 0.5));
        var pho = null;
        var inhole = false;
        var wasinbounds = false;
        while (this.dep < maxd) {
          if (bounds.testin(this.pos.x, this.pos.y, this.pos.z)) {
            wasinbounds = true;
            this.dep += 1;
            this.fdep += 1;
            this.pos.set(this.pos.add(this.vel));
            colany = false;
            var col = this.colAny();
            if (col.hole.hol != null) pho = col.hole.hol;
            /* for (var h = 0; o < holes.length; o++) {
               var obj = objects[o];
               if (obj.testin(this.pos.x, this.pos.y, this.pos.z)) {
                 if (obj.mat == "hole") {
                   infhole = true;
                   ho = obj;
                   o = objects.length;
                 } else if (infhole == false) {
                   colany = true;
                   hobj = obj;
                 }
               }
             }*/
            if (col.in && col.hol == null && !col.hole.in) {
              switch (col.obj.mat) {
                default:
                case "diffuse":
                  this.hitDiffuse(col.obj, pho);
                  break;
                case "mirror":
                  this.hitMirror(col.obj, pho);
                  break;
                case "glossy":
                  this.hitGlossy(col.obj, pho);
                  break;
                case "glass":
                  this.hitGlass(col.obj, pho);
                  break;
              }
              return;
            }
          } else {
            this.dep += 1;
            this.fdep += 1;
            this.pos.set(this.pos.add(this.vel));
            if (wasinbounds) {
              this.dep = maxd + 1;
              this.fdep = this.dep;
              push[int(this.cel.x)][int(this.cel.y)] = [...background];
              return;
            }
          }
        }
        push[int(this.cel.x)][int(this.cel.y)] = [...background];
        //if (this.dep >= maxd) {
        //  push[int(this.cel.x)][int(this.cel.y)] = background;
        //}
        break;
      case "find":
        this.vel.set(this.vel.normalize().multN(0.7, 0.7, 0.7));
        var hitdata = { obj: new object(null, null, null, null, null, null, null, null, null, null, null), pos: this.pos.round(), vel: this.vel.round(), hit: false };
        var inhole = false;
        var colany = false;
        while (this.dep < maxd) {
          this.dep += 1;
          this.pos.set(this.pos.add(this.vel));
          inhole = false;
          colany = false;
          for (var o = 0; o < objects.length; o++) {
            var obj = objects[o];
            if (obj.testin(this.pos.x, this.pos.y, this.pos.z)) {
              if (obj.mat == "hole") {
                inhole = true;
              } else if (inhole == false) {
                colany = true;
              }
            }
          }
          for (var o = 0; o < objects.length && colany; o++) {
            var obj = objects[o];
            if (obj.testin(this.pos.x, this.pos.y, this.pos.z)) {
              if (obj.mat == "hole") {
                inhole = true;
              } else if (inhole == false) {
                hitdata = { obj: obj, pos: this.pos.round(), vel: this.vel.round(), hit: true };
                this.dep = maxd + 1;
              }
            }
          }
        }
        return hitdata;
        break;
      case "light":
        raycount[2]++;
        this.vel.set(this.vel.multN(1.1, 1.1, 1.1));
        var light = 1.0;
        while (this.dep < maxd && dist2(this.pos, lv) > 1) {
          this.dep += 1;
          this.pos.set(this.pos.add(this.vel));
          var col = this.colAny();
          if (col.in) {
            if (light == 1.0) light -= 0.3;
            light /= 1.1;
            light -= 0.05;
            if (light <= 0.05) return light;
            //light = 0;
            //return 0;
          }
          if (light <= 0.05) { return light; }
          if (!bounds.testin(this.pos.x, this.pos.y, this.pos.z)) { return 1.0; }
        }
        return light;
        break;
    }
  }

  this.colAny = function () {
    var dat = { in: false, obj: null, hole: null };
    var hole = this.inHole();
    dat.hole = hole;
    if (hole.in) {
      return dat;
    } else {
      for (var h = 0; h < objects.length; h++) {
        var obj = objects[h];
        if (obj.testin(this.pos.x, this.pos.y, this.pos.z)) {
          dat.in = true;
          dat.obj = obj;
          return dat;
        }
      }
    }
    return dat;
  }

  this.inHole = function () {
    var dat = { in: false, hol: null };
    for (var h = 0; h < holes.length; h++) {
      var obj = holes[h];
      if (obj.testin(this.pos.x, this.pos.y, this.pos.z)) {
        dat.in = true;
        dat.hol = obj;
        return dat;
      }
    }
    return dat;
  }

  /* 
  Calc:
  Ambient  (base color)
  Diffuse  (flat shading / brightness)
  Seconday shading (relect, find light bonce from diffuse/glossy/mirror)
  Specular (Direct reflection, only for glossy)
  Color reflect (Next hit obj, only for glossy)

  Diffuse:
  (Ambient+Diffuse)/2+SS
  Glossy:
  (Ambient+Diffuse+CR)/3+SS+Specular
  */

  this.moveout = function (tobj, dep = 3) {
    dep--;
    if (dep >= 0) {
      /*var fin = false;
      this.pos = this.pos.sub(this.vel);
      var mvel = this.vel.set(this.vel.multN(0.07, 0.07, 0.07)).get();
      while (!fin) {
        this.pos = this.pos.add(mvel);
        var c = this.colAny();
        if (c.in) {
          fin = true;
          this.pos = this.pos.sub(mvel);
          this.moveout(tobj, dep);
        }
      }*/
      var fin = false;
      var mvel = this.vel.set(this.vel.multN(0.07, 0.07, 0.07)).get();
      while (!fin) {
        this.pos = this.pos.sub(mvel);
        var c = this.colAny();
        if (!c.in || c.obj != tobj) {
          fin = true;
          this.pos = this.pos.add(mvel);
          this.moveout(tobj, dep);
        }
      }
    }
  }

  this.inLight = function () {
    var vel = lv.sub(this.pos).normalize();
    var lray = new ray(this.pos.x, this.pos.y, this.pos.z, vel.x, vel.y, vel.z, 0, 0, "light");
    return { amount: Math.max(Math.min(lray.update(), 1), 0), ray: lray };
  }

  this.hitDiffuse = function (obj, hol) {
    //this.pos = this.pos.sub(this.vel.multN(0.5,0.5,0.5));
    this.moveout(obj);
    var sat = 1.0;
    var sdir = (hol != null) ? (((hol.type + "") == ("box")) ? 1 : -1) : (-1);
    var nv = (hol != null) ? new vector(0, 0, 0).set(hol.getNormal(this.pos)).normalize().multN(sdir, sdir, sdir) : obj.getNormal(this.pos);
    var lray = this.inLight();
    sat = 1.0 - (dist2(nv, lray.ray.vel) / 4.0);
    sat = Math.max(sat, 0.15) * lray.amount;
    push[int(this.cel.x)][int(this.cel.y)][0] = (int(int(r(obj.color)) * sat));
    push[int(this.cel.x)][int(this.cel.y)][1] = (int(int(g(obj.color)) * sat));
    push[int(this.cel.x)][int(this.cel.y)][2] = (int(int(b(obj.color)) * sat));
    // push[int(this.cel.x)][int(this.cel.y)][2] = int(b(obj.color) * sat * (inshade ? 0.3 : 1.0));
    this.dep = maxd + 1;
  }

  this.hitMirror = function (obj, hol) {
    this.moveout(obj);
    if (this.bounce + 0 < maxb) {
      this.pos = this.pos.sub(this.vel);
      var sdir = (hol != null) ? (((hol.type + "") == ("box")) ? 1 : -1) : (-1);
      var nv = (hol != null) ? new vector(0, 0, 0).set(hol.getNormal(this.pos)).normalize().multN(sdir, sdir, sdir) : obj.getNormal(this.pos);
      this.vel = reflect(this.vel, nv).normalize();
      var rray = new ray(this.pos.x, this.pos.y, this.pos.z, this.vel.x, this.vel.y, this.vel.z, this.cel.x, this.cel.y, "primary");
      rray.bounce = this.bounce + 1;
      raycount[1]++;
      rray.update();
      push[int(this.cel.x)][int(this.cel.y)][0] += int(obj.data2);
      push[int(this.cel.x)][int(this.cel.y)][1] += int(obj.data2);
      push[int(this.cel.x)][int(this.cel.y)][2] += int(obj.data2);
      this.dep = maxd + 1;
    } else {
      this.hitDiffuse(obj, hol);
      this.dep = maxd + 1;
    }
  }

  this.hitGlossy = function (obj, hol) {
    this.moveout(obj);
    if (this.bounce + 0 < maxb) {
      var d = obj.data2.split(",");
      this.pos = this.pos.sub(this.vel);
      var sdir = (hol != null) ? (((hol.type + "") == ("box")) ? 1 : -1) : (-1);
      var nv = (hol != null) ? new vector(0, 0, 0).set(hol.getNormal(this.pos)).normalize().multN(sdir, sdir, sdir) : obj.getNormal(this.pos);
      this.vel = reflect(this.vel, nv).normalize();
      var diff = int(d[0]);
      var div = int(d[1]);
      var off = [((Math.random() - 0.5) + (Math.random() - 0.5)) / (diff + 1.0), ((Math.random() - 0.5) + (Math.random() - 0.5)) / (diff + 1.0), ((Math.random() - 0.5) + (Math.random() - 0.5)) / (diff + 1.0)];
      var rray = new ray(this.pos.x, this.pos.y, this.pos.z, this.vel.x + off[0], this.vel.y + off[1], this.vel.z + off[2], this.cel.x, this.cel.y, "primary");
      rray.bounce = this.bounce + 1;
      raycount[1]++;
      rray.update();
      div *= Math.pow((rray.fdep) / 20.0, 2);
      var lray = this.inLight();
      push[int(this.cel.x)][int(this.cel.y)][0] = (int(lray.amount * (push[int(this.cel.x)][int(this.cel.y)][0] + int(div * r(obj.color))) / (1.0 + div)));
      push[int(this.cel.x)][int(this.cel.y)][1] = (int(lray.amount * (push[int(this.cel.x)][int(this.cel.y)][1] + int(div * g(obj.color))) / (1.0 + div)));
      push[int(this.cel.x)][int(this.cel.y)][2] = (int(lray.amount * (push[int(this.cel.x)][int(this.cel.y)][2] + int(div * b(obj.color))) / (1.0 + div)));
      this.dep = maxd + 1;
    } else {
      this.hitDiffuse(obj, hol);
      this.dep = maxd + 1;
    }
  }

  this.hitGlass = function (obj, hol) {
    //this.pos = this.pos.sub(this.vel.multN(0.5,0.5,0.5));
    this.moveout(obj);
    var sat = 1.0;
    var sdir = (hol != null) ? (((hol.type + "") == ("box")) ? 1 : -1) : (-1);
    var nv = (hol != null) ? new vector(0, 0, 0).set(hol.getNormal(this.pos)).normalize().multN(sdir, sdir, sdir) : obj.getNormal(this.pos);
    var lray = this.inLight();
    sat = 1.0 - (dist2(nv, lray.ray.vel) / 4.0);
    sat = Math.max(sat, 0.15);
    sat = 1.0;
    push[int(this.cel.x)][int(this.cel.y)][0] = int(int(r(obj.color)) * sat);//(lray.in) ? (int(int(r(obj.color)) * sat)) : (shadow);
    push[int(this.cel.x)][int(this.cel.y)][1] = int(int(g(obj.color)) * sat);//(lray.in) ? (int(int(g(obj.color)) * sat)) : (shadow);
    push[int(this.cel.x)][int(this.cel.y)][2] = int(int(b(obj.color)) * sat);//(lray.in) ? (int(int(b(obj.color)) * sat)) : (shadow);
    // push[int(this.cel.x)][int(this.cel.y)][2] = int(b(obj.color) * sat * (inshade ? 0.3 : 1.0));
    this.dep = maxd + 1;
  }
}

function runnorm(objectslist, count) { ///\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\O/\\\
  try {
    var canrun = Browser.msgBox("Run Raycaster? " + objectslist[count + 1], Browser.Buttons.YES_NO);
    if (canrun == "yes") {
      clear();
      var s1 = new Date().getTime();
      basesetup(objectslist, count);
      if (raymode == "primary" || raymode == "msaa") {
        var maxs = Math.max(width, height);
        var s2 = new Date().getTime();
        for (var x = 0; x < height; x++) {
          for (var y = 0; y < width; y++) {
            var xp = (((x / maxs) - (height / (2 * maxs))) * 100);
            var yp = (((y / maxs) - (width / (2 * maxs))) * 100);
            var cray = new ray(xp + cam.x, yp + cam.y, cam.z, xp + (cam.fov * cam.vx), yp + (cam.fov * cam.vy), 1 + cam.fov * cam.vz, x, y, raymode);
            raycount[0]++;
            cray.update();
          }
        }
        var e2 = new Date().getTime();
        var hexlist = xyrgbtohexlist(push);
        pushAll(hexlist, width, height);
        var e1 = new Date().getTime();
        var m = 'Finished in ' + ((e1 - s1) / 1000) + " seconds, Ray time: " + ((e2 - s2) / 1000) + " seconds (" + (Math.round((((e2 - s2) / 1000) / ((e1 - s1) / 1000)) * 1000) / 10) + "%) \\nRays:" + raycount;
        console.log(m);
        Browser.msgBox(m);
      } else {
        return threadmain(objectslist, count);
      }
    }
  } catch (e) {
    var msg = e.stack.split(")");
    msg = msg.join(")\\n");
    var m = "Failed! " + e.name + ":" + e.message + "\\n Stack Trace:\\n" + msg;
    Browser.msgBox(m);
    console.error(m);
    throw Error(m);
  }
}

function threadmain(ol, c) {
  sset("_INT_ol", JSON.stringify(ol));
  sset("_INT_c", c);
  sset("_INT_size", width + "," + height);
  return "done";
}

function newthread(i) {
  var h = sget("_INT_size").split(",");
  width = int(h[0]);
  height = int(h[1]);
  var sx = i % 7;               // x = Height!
  var sy = Math.floor(i / 7);   // y = Width!
  var scx = Math.floor(height / 7);
  var scy = Math.floor(width / 7);
  var t1 = sx * scx + 1;
  var t2 = sy * scy + 1;
  scx = (sx == 6) ? (scx + height - (7 * scx)) : (scx);
  scy = (sy == 6) ? (scy + width - (7 * scy)) : (scy);
  sx = t1;
  sy = t2;
  basethreadsetup(JSON.parse(sget("_INT_ol")), int(sget("_INT_c")), scx, scy);
  console.info(push.length, push[0].length, "Thread ID: " + i);
  Utilities.sleep(i*7);
  ss.getRange(sx, sy).setValue(i);
  var maxs = Math.max(width, height);
  for (var x = sx; x < scx + sx; x++) {
    for (var y = sy; y < scy + sy; y++) {
      var xp = (((x / maxs) - (height / (2 * maxs))) * 100);
      var yp = (((y / maxs) - (width / (2 * maxs))) * 100);
      var cray = new ray(xp + cam.x, yp + cam.y, cam.z, xp + (cam.fov * cam.vx), yp + (cam.fov * cam.vy), 1 + cam.fov * cam.vz, x - sx, y - sy, (raymode == "multi_msaa") ? ("msaa") : ("primary"));
      raycount[0]++;
      cray.update();
      //console.info("Finished " + x + ", " + y + "  " + (x - sx) + ", " + (y - sy));
    }
  }
  var hexlist = xyrgbtohexlist(push);
  ss.getRange(sx, sy, scx, scy).setBackgrounds(hexlist);
  var m = "Finished! \\nRays:" + raycount;
  console.log(m);
}

function debug() {
  var i = 29;
  var h = sget("_INT_size").split(",");
  width = int(h[0]);
  height = int(h[1]);
  var sx = i % 7;             // x = Height!
  var sy = Math.floor(i / 7);   // y = Width!
  var scx = Math.floor(height / 7);
  var scy = Math.floor(width / 7);
  var t1 = sx * scx + 1;
  var t2 = sy * scy + 1;
  scx = (sx == 6) ? (scx + height - (7 * scx)) : (scx);
  scy = (sy == 6) ? (scy + width - (7 * scy)) : (scy);
  sx = t1;
  sy = t2;
  basethreadsetup(JSON.parse(sget("_INT_ol")), int(sget("_INT_c")), scx, scy);

  var maxs = Math.max(width, height);
  var x = 42;
  var y = 346;
  var xp = (((x / maxs) - (height / (2 * maxs))) * 100);
  var yp = (((y / maxs) - (width / (2 * maxs))) * 100);
  var cray = new ray(xp + cam.x, yp + cam.y, cam.z, xp + (cam.fov * cam.vx), yp + (cam.fov * cam.vy), 1 + cam.fov * cam.vz, x - sx, y - sy, "primary");
  console.info("Starting " + x + ", " + y + "  " + (x - sx) + ", " + (y - sy));
  cray.update();
  console.info("Finished " + x + ", " + y + "  " + (x - sx) + ", " + (y - sy));
}

function endthreads() {
  //When a thread finishes, draw it
  //Say finished when threads are done
}

function basethreadsetup(ol, c, sx, sy) {
  createobjects(ol, c);
  //saveobjects(objs, "_INT_objects");
  push = new Array(sx);
  for (var i = 0; i < sx; i++) {
    push[i] = new Array(sy);
    for (var v = 0; v < sy; v++) {
      push[i][v] = new Array(3);
      push[i][v] = [...background];
    }
  }

  //          mx       Mx      my       My      mz       Mz
  var cb = [999999, -999999, 999999, -999999, 999999, -999999];
  for (var o = 0; o < objs.length; o++) {
    var obj = objs[o];
    if (obj.pos.x - (obj.dep.x / 2) < cb[0]) {
      cb[0] = obj.pos.x - (obj.dep.x / 2) - 10;
    }
    if (int(obj.pos.x) + (obj.dep.x / 2) > cb[1]) {
      cb[1] = int(obj.pos.x) + (obj.dep.x / 2) + 10;
    }
    if (obj.pos.y - (obj.dep.y / 2) < cb[2]) {
      cb[2] = obj.pos.y - (obj.dep.y / 2) - 10;
    }
    if (int(obj.pos.y) + (obj.dep.y / 2) > cb[3]) {
      cb[3] = int(obj.pos.y) + (obj.dep.y / 2) + 10;
    }
    if (obj.pos.z - (obj.dep.z / 2) < cb[4]) {
      cb[4] = obj.pos.z - (obj.dep.z / 2) - 10;
    }
    if (int(obj.pos.z) + (obj.dep.z / 2) > cb[5]) {
      cb[5] = int(obj.pos.z) + (obj.dep.z / 2) + 10;
    }
  }
  console.log(cb);
  console.log((cb[0] + cb[1]) / 2, (cb[2] + cb[3]) / 2, (cb[4] + cb[5]) / 2, abs(cb[1] - cb[0]), abs(cb[3] - cb[2]), abs(cb[5] - cb[4]));
  bounds = new object((cb[0] + cb[1]) / 2, (cb[2] + cb[3]) / 2, (cb[4] + cb[5]) / 2, abs(cb[1] - cb[0]), abs(cb[3] - cb[2]), abs(cb[5] - cb[4]), "#FA00FA", "box", 0, "bounds", 0);
}

function basesetup(ol, c) {
  width = ss.getMaxColumns();
  height = ss.getMaxRows();
  sset("_INT_ol", ol);
  sset("_INT_c", c);
  createobjects(ol, c);
  saveobjects(objs, "_INT_objects");

  push = new Array(height);
  for (var i = 0; i < height; i++) {
    push[i] = new Array(width);
    for (var v = 0; v < width; v++) {
      push[i][v] = new Array(3);
      push[i][v] = [...background];
    }
  }

  //          mx       Mx      my       My      mz       Mz
  var cb = [999999, -999999, 999999, -999999, 999999, -999999];
  for (var o = 0; o < objs.length; o++) {
    var obj = objs[o];
    if (obj.pos.x - (obj.dep.x / 2) < cb[0]) {
      cb[0] = obj.pos.x - (obj.dep.x / 2) - 10;
    }
    if (int(obj.pos.x) + (obj.dep.x / 2) > cb[1]) {
      cb[1] = int(obj.pos.x) + (obj.dep.x / 2) + 10;
    }
    if (obj.pos.y - (obj.dep.y / 2) < cb[2]) {
      cb[2] = obj.pos.y - (obj.dep.y / 2) - 10;
    }
    if (int(obj.pos.y) + (obj.dep.y / 2) > cb[3]) {
      cb[3] = int(obj.pos.y) + (obj.dep.y / 2) + 10;
    }
    if (obj.pos.z - (obj.dep.z / 2) < cb[4]) {
      cb[4] = obj.pos.z - (obj.dep.z / 2) - 10;
    }
    if (int(obj.pos.z) + (obj.dep.z / 2) > cb[5]) {
      cb[5] = int(obj.pos.z) + (obj.dep.z / 2) + 10;
    }
  }
  bounds = new object((cb[0] + cb[1]) / 2, (cb[2] + cb[3]) / 2, (cb[4] + cb[5]) / 2, abs(cb[1] - cb[0]), abs(cb[3] - cb[2]), abs(cb[5] - cb[4]), "#FA00FA", "box", 0, "bounds", 0);
}

function createobjects(ol, count) {
  objects = [];
  holes = [];
  for (var i = 0; i < count; i++) {
    if (ol[i][9] == "hole") {
      holes.push(new object(ol[i][0], ol[i][1], ol[i][2], ol[i][3], ol[i][4], ol[i][5], ol[i][6], ol[i][7], ol[i][8], ol[i][9], ol[i][10]));
    } else {
      objects.push(new object(ol[i][0], ol[i][1], ol[i][2], ol[i][3], ol[i][4], ol[i][5], ol[i][6], ol[i][7], ol[i][8], ol[i][9], ol[i][10]));
    }
    objs.push(new object(ol[i][0], ol[i][1], ol[i][2], ol[i][3], ol[i][4], ol[i][5], ol[i][6], ol[i][7], ol[i][8], ol[i][9], ol[i][10]));
  }
  var lvd = ol[count][0].split(",");
  lv = new vector(int(lvd[0]), int(lvd[1]), int(lvd[2]));
  var cpd = ol[count][1].split(",");
  cam.x = parseFloat(cpd[0]);
  cam.y = parseFloat(cpd[1]);
  cam.z = parseFloat(cpd[2]);
  var cad = ol[count][2].split(",");
  cam.vx = parseFloat(cad[0]);
  cam.vy = parseFloat(cad[1]);
  cam.vz = parseFloat(cad[2]);
  cam.fov = parseFloat(cad[3]);
  raymode = ol[count + 1];
}

function edit() {
  var ui = SpreadsheetApp.getUi();
  var HTML = HtmlService.createHtmlOutputFromFile('editor').setWidth(300).setTitle('Object Editor');
  ui.showSidebar(HTML);
}

function debugspot() {
  width = ss.getMaxColumns();
  height = ss.getMaxRows();
  loadobjects("_INT_objects");
  var x = ss.getActiveCell().getColumn();
  var y = ss.getActiveCell().getRow();
  var hex = ss.getActiveCell().getBackground();
  var r = parseInt(hex[1] + "" + hex[2], 16);
  var g = parseInt(hex[3] + "" + hex[4], 16);
  var b = parseInt(hex[5] + "" + hex[6], 16);
  var list = new Array(1);
  list[0] = new Array(1);
  list[0][0] = new Array(3);
  list[0][0][0] = r;
  list[0][0][1] = g;
  list[0][0][2] = b;
  var hl = xyrgbtohexlist(list);
  var rayhit = screentoworld(y, x);
  Browser.msgBox("Debug info for spot X:" + y + " Y:" + x +
    "\\n Color HEX:" + hex + "\nR:" + r + " G:" + g + " B:" + b + " HL:" + hl +
    "\\n Hit: " + rayhit.pos.string() + ", " + rayhit.vel.string() +
    "\\n Object: " + rayhit.obj.string());
}

function huemap() {
  width = 255;
  height = 255;
  push = new Array(width);
  for (var i = 0; i < width; i++) {
    push[i] = new Array(height);
    for (var v = 0; v < height; v++) {
      var rgb = hsvtorgb((i / width), v / height, 1);
      push[i][v] = rgbtohex(rgb.r, rgb.g, rgb.b);
    }
  }
  // for(var x = 0; x < width; x++) {
  //   for(var y = 0; y < height; y++) {
  //     var rgb = hsvtorgb((x/255),y/height,1);
  //     push[x][y] = rgbtohex(rgb.r,rgb.g,rgb.b);
  //   }
  // }
  pushAll(push, width, height);
}

function hex(rgb) {
  return rgbtohex(rgb[0], rgb[1], rgb[2]);
}

function rgbtohex(r, g, b) {
  var hex = "";
  var ro = r.toString(base);
  var go = g.toString(base);
  var bo = b.toString(base);
  hex = "#" + ro + "" + go + "" + bo + "";
  return hex;
}

function xyrgbtohexlist(rgblist) {
  var hex = new Array(rgblist.length);
  for (var x = 0; x < rgblist.length; x++) {
    hex[x] = new Array(rgblist[0].length);
    for (var y = 0; y < rgblist[0].length; y++) {
      var r = Math.min(rgblist[x][y][0], 255).toString(base);
      if (rgblist[x][y][0] < 16) { r = "0" + r }
      var g = Math.min(rgblist[x][y][1], 255).toString(base);
      if (rgblist[x][y][1] < 16) { g = "0" + g }
      var b = Math.min(rgblist[x][y][2], 255).toString(base);
      if (rgblist[x][y][2] < 16) { b = "0" + b }
      hex[x][y] = "#" + r + "" + g + "" + b + "";
    }
  }
  return hex;
}

function r(color) { return parseInt("" + color[1] + "" + color[2] + "", 16); }
function g(color) { return parseInt("" + color[3] + "" + color[4] + "", 16); }
function b(color) { return parseInt("" + color[5] + "" + color[6] + "", 16); }

function pushAll(pushList, w, h) {
  //clear();
  ss.getRange(1, 1, h, w).setBackgrounds(pushList);
  SpreadsheetApp.flush();
}

function hsvtorgb(h, s, v) {
  var r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

function clear() {
  ss.getRange(1, 1, ss.getMaxRows(), ss.getMaxColumns()).setBackground("white");
  ss.getRange(1, 1, ss.getMaxRows(), ss.getMaxColumns()).setValue("");
}

function resize() {
  var ch = ss.getMaxRows();
  var cw = ss.getMaxColumns();
  var wh = Browser.inputBox("Resize canvas to Width,Height from " + cw + "," + ch).split(",");
  console.log("Resizing to " + wh);
  var w = parseInt(wh[0]);
  var h = parseInt(wh[1]);
  if (ch > h) {
    ss.deleteRows(1, ch - h);
  }
  if (ch < h) {
    ss.insertRowsBefore(1, h - ch);
  }
  if (cw > w) {
    ss.deleteColumns(1, cw - w);
  }
  if (cw < w) {
    ss.insertColumnsAfter(1, w - cw);
  }
  ss.getRange(h, w).setValue(".");
  //console.log("Resized to " + wh);
}

function screentoworld(x, y) {
  return findray(new vector(x - (height / 2) + cam.x, y - (width / 2) + cam.y, cam.z), new vector(x - (height / 2) + (cam.fov * cam.vx), y - (width / 2) + (cam.fov * cam.vy), cam.fov * cam.vz));
}

function findray(p, v) {
  var r = rayfv(p, v, new vector(0, 0, 0), "find");
  return r.update();
}

function rayfv(p, v, s, t) {
  return new ray(p.x, p.y, p.z, v.x, v.y, v.z, s.x, s.y, t);
}

function sqr(x) {
  return Math.pow(x, 2);
}

function normVec(x, y, z) {
  var l = Math.sqrt(sqr(x) + sqr(y) + sqr(z));
  return {
    x: x / l,
    y: y / l,
    z: z / l
  }
}

function reflect(d, n) {
  var inner = new vector(0, 0, 0);
  inner = d.dot(n);
  inner = n.multN(inner, inner, inner);
  inner = inner.multN(-2, -2, -2);
  var vec = d.clone().add(inner).normalize().round();
  return vec;
}

function saveobjects(o, k) {
  //sset(k, "");
  var save = "";
  for (var i = 0; i < o.length; i++) {
    save += o[i].savestring();
  }
  save += "&" + lv.x + "," + lv.y + "," + lv.z + ":" + cam.x + "," + cam.y + "," + cam.z + ":" + cam.vx + "," + cam.vy + "," + cam.vz + "," + cam.fov;
  sset(k, save);
}

function loadobjects(k) {
  var data = sget(k).split("&");
  objects = new Array(data.length - 2);
  for (var i = 1; i < data.length - 1; i++) {
    var dat = data[i].split(",");
    objects[i - 1] = new object(dat[0], dat[1], dat[2], dat[3], dat[4], dat[5], dat[6], dat[7], dat[8], dat[9]);
  }
  var lvd = data[data.length - 1].split(",");
  lv = new vector(int(lvd[0]), int(lvd[1]), int(lvd[2]));
  return sget(k);
}

function saveobjectssb(ol, c) {
  createobjects(ol, c);
  var k = Browser.inputBox("Save objects to Save Key");
  saveobjects(objs, k);
  if (k == "_INT_debug") Browser.msgBox(sget(k));
}

function setpl(x, y, c) {
  push[x][y] = c;
}

function psget() { return sget(Browser.inputBox("Enter Key")); }
function sget(key) { return ScriptProperties.getProperty(key); }
function sset(key, val) { return ScriptProperties.setProperty(key, val); }
function srem(key) { ScriptProperties.deleteProperty(key); }
function sslist() {
  var op = "";
  var skeys = ScriptProperties.getKeys().sort();
  for (var i = 0; i < skeys.length; i++) {
    if (!skeys[i].startsWith("_INT_")) op += skeys[i] + "\\n";
  }
  Browser.msgBox(op);
  return op;
}
function sslistint() {
  var op = "Listed Internal Keys:\\n";
  var skeys = ScriptProperties.getKeys().sort();
  for (var i = 0; i < skeys.length; i++) {
    if (skeys[i].startsWith("_INT_")) op += skeys[i] + "\\n"
  }
  Browser.msgBox(op);
  return op;
}
function rebuild() {
  var din = Browser.inputBox("data");
  var segs = din.split("♦");
  var op = "";
  for (var i in segs) {
    var data = segs[i].split("○");
    op += ">" + data[0] + "\\n>> " + data[1] + "\\n";
    sset(data[0], data[1]);
  }
  return op;
}

function abs(n) {
  return Math.abs(n);
}

function int(n) {
  return parseInt(n);
}

function dist2(p1, p2) {
  return sqr(p1.x - p2.x) + sqr(p1.y - p2.y) + sqr(p1.z - p2.z);
}

function rndint(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
