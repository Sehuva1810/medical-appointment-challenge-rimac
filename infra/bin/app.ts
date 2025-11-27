#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MedicalAppointmentsStack } from '../lib/medical-appointments-stack';

/**
 * CDK App Entry Point
 *
 * Crea la aplicación CDK y el stack principal.
 * El stage se determina por el contexto de CDK.
 *
 * Uso:
 * - cdk deploy --context stage=dev
 * - cdk deploy --context stage=prod
 */
const app = new cdk.App();

// Obtener stage del contexto
const stage = app.node.tryGetContext('stage') || 'dev';

// Configuración por ambiente
const envConfig: Record<string, { account?: string; region: string }> = {
  dev: {
    region: 'us-east-1',
  },
  prod: {
    region: 'us-east-1',
  },
};

// Crear stack principal
new MedicalAppointmentsStack(app, `MedicalAppointments-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: envConfig[stage]?.region || 'us-east-1',
  },
  stage,
  description: `Medical Appointments API - ${stage} environment`,
  tags: {
    Project: 'MedicalAppointments',
    Environment: stage,
    ManagedBy: 'CDK',
  },
});

app.synth();
