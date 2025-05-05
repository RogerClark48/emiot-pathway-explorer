module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Course', {
    courseId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    courseName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false
    },
    level: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    subjectArea: {
      type: DataTypes.STRING
    },
    description: {
      type: DataTypes.TEXT
    },
    qualificationType: {
      type: DataTypes.STRING
    },
    courseUrl: {
      type: DataTypes.STRING
    }
  }, {
    timestamps: false
  });
};