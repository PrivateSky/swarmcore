var core = require ("../../../SwarmCore/lib/SwarmCore.js");
thisAdapter = core.createAdapter("MySqlAdapter");

var Q = require("Q");
var cfg = getMyConfig("MySqlAdapter");

var Sequelize = require('sequelize')
    , sequelize = new Sequelize(cfg.database,cfg.user, cfg.pass, {
     dialect: "mysql", // or 'sqlite', 'postgres', 'mariadb'
     host:cfg.host,
     port:cfg.port
    })

sequelize
    .authenticate()
    .complete(function(err) {
     if (!!err) {
      console.log('Unable to connect to the database:', err)
     } else {
      console.log('Connection has been established successfully.')
     }
    })

var Analytics = require ("../lib/dbModels/Analytics.js").declare(sequelize);
//sequelize.sync({force:true});
sequelize.sync();

doSave = function(data, callback){
 console.log("Saving record: ", data);

 var resultId = Q(Analytics.create(data));
 (function(resultId){
  console.log("Saved record, with result ", resultId);
  callback(null, resultId);
 }).swait(resultId);

}
