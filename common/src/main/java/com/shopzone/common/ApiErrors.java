package com.shopzone.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
  ResponseEntity<ProblemDetail> stale(Exception e) {
    return ResponseEntity.status(409)
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.CONFLICT, "Data changed concurrently; reload and retry"));
  }

  @ExceptionHandler(ApiException.class)
  ResponseEntity<ProblemDetail> business(ApiException e) {
    return ResponseEntity.status(e.status)
        .body(ProblemDetail.forStatusAndDetail(e.status, e.getMessage()));
  }

  @ExceptionHandler({
    MethodArgumentNotValidException.class,
    HttpMessageNotReadableException.class,
    IllegalArgumentException.class
  })
  ResponseEntity<ProblemDetail> validation(Exception e) {
    return ResponseEntity.badRequest()
        .body(
            ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Invalid request; check required fields, types and allowed values"));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ProblemDetail> duplicate(Exception e) {
    return ResponseEntity.status(409)
        .body(
            ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Conflicting or duplicate data"));
  }
}
