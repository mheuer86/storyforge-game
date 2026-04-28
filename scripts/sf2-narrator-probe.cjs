#!/usr/bin/env node

const { createJiti } = require('jiti')

const jiti = createJiti(__filename, { interopDefault: true })
jiti('./sf2-narrator-probe.ts')
