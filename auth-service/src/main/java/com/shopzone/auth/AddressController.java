package com.shopzone.auth;

import com.shopzone.common.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me/addresses")
public class AddressController {
  private final JdbcTemplate jdbc;
  public AddressController(JdbcTemplate jdbc) { this.jdbc = jdbc; }
  public record AddressInput(
      @NotBlank @Size(max=150) String recipient,
      @NotBlank @Size(max=20) String phone,
      @NotBlank @Size(max=500) String address,
      @NotBlank @Size(max=100) String city,
      @NotBlank @Size(max=100) String ward,
      boolean isDefault) {}
  @GetMapping
  public List<Map<String,Object>> list() {
    return jdbc.queryForList("select id,recipient,phone,address,city,ward,is_default from customer_addresses where user_id=? order by is_default desc,created_at desc", Caller.id());
  }
  private void lockOwner() { jdbc.queryForObject("select id from users where id=? for update", UUID.class, Caller.id()); }
  @PostMapping
  @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
  @Transactional
  public List<Map<String,Object>> create(@Valid @RequestBody AddressInput r) {
    lockOwner();
    int count=jdbc.queryForObject("select count(*) from customer_addresses where user_id=?",Integer.class,Caller.id());
    if(count>=20) throw ApiException.bad("Address book limit is 20");
    boolean primary=r.isDefault() || count==0;
    if(primary) jdbc.update("update customer_addresses set is_default=false where user_id=?",Caller.id());
    jdbc.update("insert into customer_addresses(id,user_id,recipient,phone,address,city,ward,is_default) values (?,?,?,?,?,?,?,?)",UUID.randomUUID(),Caller.id(),r.recipient().trim(),r.phone().trim(),r.address().trim(),r.city().trim(),r.ward().trim(),primary);
    return list();
  }
  @PutMapping("/{id}")
  @Transactional
  public List<Map<String,Object>> update(@PathVariable UUID id,@Valid @RequestBody AddressInput r) {
    lockOwner();
    if(jdbc.queryForObject("select count(*) from customer_addresses where id=? and user_id=?",Integer.class,id,Caller.id())==0) throw ApiException.missing();
    if(r.isDefault()) jdbc.update("update customer_addresses set is_default=false where user_id=?",Caller.id());
    jdbc.update("update customer_addresses set recipient=?,phone=?,address=?,city=?,ward=?,is_default=? where id=? and user_id=?",r.recipient().trim(),r.phone().trim(),r.address().trim(),r.city().trim(),r.ward().trim(),r.isDefault(),id,Caller.id());
    return list();
  }
  @DeleteMapping("/{id}")
  @Transactional
  public List<Map<String,Object>> delete(@PathVariable UUID id) {
    lockOwner();
    if(jdbc.update("delete from customer_addresses where id=? and user_id=?",id,Caller.id())!=1) throw ApiException.missing();
    return list();
  }
}
