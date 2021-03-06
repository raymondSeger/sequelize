'use strict';

const Support   = require('../support'),
  QueryTypes = require('../../../lib/query-types'),
  util = require('util'),
  _ = require('lodash'),
  expectsql = Support.expectsql,
  current   = Support.sequelize,
  Sequelize = Support.Sequelize,
  sql       = current.dialect.QueryGenerator;

// Notice: [] will be replaced by dialect specific tick/quote character when there is not dialect specific expectation but only a default expectation

suite(Support.getTestDialectTeaser('SQL'), () => {
  suite('delete', () => {
    const User = current.define('test_user', {}, {
      timestamps: false,
      schema: 'public'
    });

    suite('truncate #4306', () => {
      const options = {
        table: User.getTableName(),
        where: {},
        truncate: true,
        cascade: true,
        limit: 10,
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        return expectsql(
          sql.truncateTableQuery(
            options.table,
            options
          ), {
            postgres: 'TRUNCATE "public"."test_users" CASCADE',
            mssql: 'TRUNCATE TABLE [public].[test_users]',
            mysql: 'TRUNCATE `public.test_users`',
            sqlite: 'DELETE FROM `public.test_users`'
          }
        );
      });
    });

    suite('truncate with cascade and restartIdentity', () => {
      const options = {
        table: User.getTableName(),
        where: {},
        truncate: true,
        cascade: true,
        restartIdentity: true,
        limit: 10,
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        return expectsql(
          sql.truncateTableQuery(
            options.table,
            options
          ), {
            postgres: 'TRUNCATE "public"."test_users" RESTART IDENTITY CASCADE',
            mssql: 'TRUNCATE TABLE [public].[test_users]',
            mysql: 'TRUNCATE `public.test_users`',
            sqlite: 'DELETE FROM `public.test_users`'
          }
        );
      });
    });

    suite('delete without limit', () => {
      const options = {
        table: User.getTableName(),
        where: {name: 'foo' },
        limit: null,
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        return expectsql(
          sql.deleteQuery(
            options.table,
            options.where,
            options,
            User
          ), {
            default: "DELETE FROM [public.test_users] WHERE `name` = 'foo'",
            postgres: 'DELETE FROM "public"."test_users" WHERE "name" = \'foo\'',
            sqlite: "DELETE FROM `public.test_users` WHERE `name` = 'foo'",
            mssql: "DELETE FROM [public].[test_users] WHERE [name] = N'foo'; SELECT @@ROWCOUNT AS AFFECTEDROWS;"
          }
        );
      });
    });

    suite('delete with limit', () => {
      const options = {
        table: User.getTableName(),
        where: {name: "foo';DROP TABLE mySchema.myTable;"},
        limit: 10,
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        return expectsql(
          sql.deleteQuery(
            options.table,
            options.where,
            options,
            User
          ), {
            postgres: 'DELETE FROM "public"."test_users" WHERE "id" IN (SELECT "id" FROM "public"."test_users" WHERE "name" = \'foo\'\';DROP TABLE mySchema.myTable;\' LIMIT 10)',
            sqlite: "DELETE FROM `public.test_users` WHERE rowid IN (SELECT rowid FROM `public.test_users` WHERE `name` = \'foo\'\';DROP TABLE mySchema.myTable;\' LIMIT 10)",
            mssql: "DELETE TOP(10) FROM [public].[test_users] WHERE [name] = N'foo'';DROP TABLE mySchema.myTable;'; SELECT @@ROWCOUNT AS AFFECTEDROWS;",
            default: "DELETE FROM [public.test_users] WHERE `name` = 'foo\\';DROP TABLE mySchema.myTable;' LIMIT 10"
          }
        );
      });
    });

    suite('delete with limit and without model', () => {
      const options = {
        table: User.getTableName(),
        where: {name: "foo';DROP TABLE mySchema.myTable;"},
        limit: 10,
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        let query;
        try {
          query = sql.deleteQuery(
            options.table,
            options.where,
            options,
            null
          );
        } catch (err) {
          query = err;
        }

        return expectsql(
          query, {
            postgres: new Error('Cannot LIMIT delete without a model.'),
            sqlite: "DELETE FROM `public.test_users` WHERE rowid IN (SELECT rowid FROM `public.test_users` WHERE `name` = 'foo'';DROP TABLE mySchema.myTable;' LIMIT 10)",
            mssql: "DELETE TOP(10) FROM [public].[test_users] WHERE [name] = N'foo'';DROP TABLE mySchema.myTable;'; SELECT @@ROWCOUNT AS AFFECTEDROWS;",
            default: "DELETE FROM [public.test_users] WHERE `name` = 'foo\\';DROP TABLE mySchema.myTable;' LIMIT 10"
          }
        );
      });
    });

    suite('delete when the primary key has a different field name', () => {
      const User = current.define('test_user', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          field: 'test_user_id'
        }
      }, {
        timestamps: false,
        schema: 'public'
      });

      const options = {
        table: 'test_user',
        where: { 'test_user_id': 100 },
        type: QueryTypes.BULKDELETE
      };

      test(util.inspect(options, {depth: 2}), () => {
        return expectsql(
          sql.deleteQuery(
            options.table,
            options.where,
            options,
            User
          ), {
            postgres: 'DELETE FROM "test_user" WHERE "test_user_id" = 100',
            sqlite: 'DELETE FROM `test_user` WHERE `test_user_id` = 100',
            mssql: 'DELETE FROM [test_user] WHERE [test_user_id] = 100; SELECT @@ROWCOUNT AS AFFECTEDROWS;',
            default: 'DELETE FROM [test_user] WHERE [test_user_id] = 100'
          }
        );
      });
    });

    suite('delete with undefined parameter in where', () => {
      const options = {
        table: User.getTableName(),
        type: QueryTypes.BULKDELETE,
        where: {name: undefined },
        limit: null
      };

      test(util.inspect(options, {depth: 2}), () => {
        const sqlOrError = _.attempt(
          sql.deleteQuery.bind(sql),
          options.table,
          options.where,
          options,
          User
        );
        return expectsql(sqlOrError, {
          default: new Error('WHERE parameter "name" has invalid "undefined" value')
        });
      });
    });
  });
});
