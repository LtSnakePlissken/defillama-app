import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from 'components'
import { NameYield } from 'components/Table'
import { YieldAttributes, TVLRange, FiltersByChain } from 'components/Filters'
import { YieldsSearch } from 'components/Search'
import {
  useNoILManager,
  useSingleExposureManager,
  useStablecoinsManager,
  useMillionDollarManager,
  useAuditedManager,
} from 'contexts/LocalStorage'
import { capitalizeFirstLetter } from 'utils'
import { columns, TableWrapper } from './shared'

const YieldPage = ({ pools, chainList }) => {
  const chain = [...new Set(pools.map((el) => el.chain))]
  const selectedTab = chain.length > 1 ? 'All' : chain[0]
  const [chainsToFilter, setChainsToFilter] = useState<string[]>(chainList)

  const { query } = useRouter()
  const { minTvl, maxTvl } = query

  // if route query contains 'project' remove project href
  const idx = columns.findIndex((c) => c.accessor === 'project')

  if (query.project) {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => (
        <NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} rowType="accordion" />
      ),
    }
  } else {
    columns[idx] = {
      header: 'Project',
      accessor: 'project',
      disableSortBy: true,
      Cell: ({ value, rowValues }) => (
        <NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} />
      ),
    }
  }

  // toggles
  const [stablecoins] = useStablecoinsManager()
  const [noIL] = useNoILManager()
  const [singleExposure] = useSingleExposureManager()
  const [millionDollar] = useMillionDollarManager()
  const [audited] = useAuditedManager()
  // apply toggles
  pools = stablecoins === true ? pools.filter((el) => el.stablecoin === true) : pools
  pools = noIL === true ? pools.filter((el) => el.ilRisk === 'no') : pools
  pools = singleExposure === true ? pools.filter((el) => el.exposure === 'single') : pools
  pools = millionDollar === true ? pools.filter((el) => el.tvlUsd >= 1e6) : pools
  pools = audited === true ? pools.filter((el) => el.audits !== '0') : pools

  const poolsData = useMemo(() => {
    const poolsData = pools
      .map((t) => ({
        id: t.pool,
        pool: t.symbol,
        projectslug: t.project,
        project: t.projectName,
        chains: [t.chain],
        tvl: t.tvlUsd,
        apy: t.apy,
        change1d: t.apyPct1D,
        change7d: t.apyPct7D,
        outlook: t.predictions.predictedClass,
        confidence: t.predictions.binnedConfidence,
      }))
      .filter((p) => chainsToFilter.includes(p.chains[0]))

    const isValidTvlRange =
      (minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

    return isValidTvlRange
      ? poolsData.filter((p) => (minTvl ? p.tvl > minTvl : true) && (maxTvl ? p.tvl < maxTvl : true))
      : poolsData
  }, [minTvl, maxTvl, pools, chainsToFilter])

  let stepName = undefined
  if (query.chain) stepName = selectedTab
  else if (query.project) stepName = poolsData[0]?.project ?? capitalizeFirstLetter(query.project)

  return (
    <>
      <YieldsSearch step={{ category: 'Yields', name: stepName ?? 'All chains' }} />

      <TableFilters>
        <TableHeader>Yield Rankings</TableHeader>
        <Dropdowns>
          <FiltersByChain chains={chainList} setChainsToFilter={setChainsToFilter} />
          <YieldAttributes />
          <TVLRange />
        </Dropdowns>
      </TableFilters>

      {poolsData.length > 0 ? (
        <TableWrapper data={poolsData} columns={columns} />
      ) : (
        <Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
          {stepName ? `${stepName} has no pools listed` : "Couldn't find any pools for these filters"}
        </Panel>
      )}
    </>
  )
}

const TableFilters = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin: 0 0 -20px;
`

const Dropdowns = styled.span`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;

  button {
    font-weight: 400;
  }
`

const TableHeader = styled.h1`
  margin: 0 auto 0 0;
  font-weight: 500;
  font-size: 1.125rem;
`

export default YieldPage