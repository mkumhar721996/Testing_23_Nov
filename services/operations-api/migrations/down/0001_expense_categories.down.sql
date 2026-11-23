-- Manual rollback; the runner never applies this folder.
drop table if exists expense_category_audit;
drop table if exists expense_categories;
delete from schema_migrations where name = '0001_expense_categories.sql';
