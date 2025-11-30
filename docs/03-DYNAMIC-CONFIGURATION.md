# 🔄 Dynamic Configuration Strategy

## Overview

This document outlines the strategy for making Amazon Connect configurations dynamic and manageable without requiring framework redeployment. The approach uses DynamoDB for configuration storage, Lambda functions for retrieval, and S3 for flow templates.

## Architecture Pattern: Configuration as Data

### Core Principle

**Separate infrastructure provisioning from business logic configuration**. The CDK framework provisions resources (queues, routing profiles, users) while DynamoDB stores the business logic configurations (which queue to use for which scenario, logging preferences, flow parameters).

