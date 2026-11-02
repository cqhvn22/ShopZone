package com.shopzone.inventory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shopzone.persistence.EventStore;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;

/** Re-runs all inventory transaction/concurrency cases against a real isolated PostgreSQL. */
class PostgresTransactionsIT extends InventoryTransactionsTest {
  private static String serverUrl;
  private static String password;
  private static JdbcTemplate admin;
  private static final java.util.List<String> databases = new java.util.ArrayList<>();

  @BeforeAll
  static void connectPostgres() {
    serverUrl =
        System.getenv()
            .getOrDefault("TEST_POSTGRES_URL", "jdbc:postgresql://localhost:5432/postgres");
    password = System.getenv("POSTGRES_PASSWORD");
    if (password == null || password.isBlank())
      throw new IllegalStateException(
          "Load .env first: POSTGRES_PASSWORD is required for isolated PostgreSQL tests");
    admin = new JdbcTemplate(new DriverManagerDataSource(serverUrl, "postgres", password));
  }

  @Override
  @BeforeEach
  void init() {
    String database = "test_" + UUID.randomUUID().toString().replace("-", "");
    admin.execute("CREATE DATABASE " + database);
    databases.add(database);
    var ds =
        new DriverManagerDataSource(
            serverUrl.substring(0, serverUrl.lastIndexOf('/') + 1) + database,
            "postgres",
            password);
    Flyway.configure().dataSource(ds).load().migrate();
    jdbc = new JdbcTemplate(ds);
    tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
    json = new ObjectMapper().findAndRegisterModules();
    events = new EventStore(jdbc, json);
    flow = new InventoryFlow(jdbc, events);
    listener = new InventoryEvents(events, flow);
    jdbc.update("insert into stock_items(sku,on_hand,reserved,version) values ('PHONE',10,0,0)");
  }

  @Test
  void allServiceMigrationsRunOnPostgres() {
    for (String service : new String[] {"auth", "order", "payment", "notification"}) {
      String database = "test_" + UUID.randomUUID().toString().replace("-", "");
      admin.execute("CREATE DATABASE " + database);
      databases.add(database);
      var ds =
          new DriverManagerDataSource(
              serverUrl.substring(0, serverUrl.lastIndexOf('/') + 1) + database,
              "postgres",
              password);
      var location =
          java.nio.file.Path.of(
                  "..", service + "-service", "src", "main", "resources", "db", "migration")
              .toAbsolutePath()
              .normalize();
      Flyway.configure().dataSource(ds).locations("filesystem:" + location).load().migrate();
    }
  }

  @AfterAll
  static void removeIsolatedDatabases() {
    if (admin != null)
      for (String database : databases) {
        if (!database.matches("test_[a-f0-9]{32}"))
          throw new IllegalStateException("Unexpected test database name");
        admin.execute("DROP DATABASE " + database);
      }
  }
}
