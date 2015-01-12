Sequelize = require('sequelize');

exports.declare = function (sequelize){
    return sequelize.define('Analytic', {
        id: Sequelize.STRING,
        type:Sequelize.STRING,
        content: Sequelize.STRING
    }, {
        tableName: 'analytics', // this will define the table's name
        timestamps: true        // this will enable/deactivate the timestamp columns
    })
}