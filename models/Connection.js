module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Connection', {
    connectionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fromCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'courseId'
      }
    },
    toCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Courses',
        key: 'courseId'
      }
    },
    notes: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['fromCourseId', 'toCourseId']
      }
    ]
  });
};