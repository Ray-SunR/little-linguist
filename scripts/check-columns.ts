
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function check() {
  console.log('Checking columns for table "children"...')
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching data:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns for "children":', Object.keys(data[0]))
  }

  console.log('Checking columns for table "word_insights"...')
  const { data: wiData, error: wiError } = await supabase
    .from('word_insights')
    .select('*')
    .limit(1)

  if (wiData && wiData.length > 0) {
    console.log('Columns for "word_insights":', Object.keys(wiData[0]))
  }
}

check()
