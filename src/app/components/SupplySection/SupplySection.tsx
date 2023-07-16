import { CellPosition, StorageItem } from '@/game/types';
import { resourceLocalization, ResourceType } from '@/game/resources';
import { humanFormat } from '@/utils/format';
import { ActualPathState } from '@/app/modals/FacilityModal/helpers';

import styles from './SupplySection.module.scss';

export const enum StorateType {
  INPUT,
  OUTPUT,
}

export function SupplySection({
  title,
  storageType,
  storage,
  alreadyPaths,
  onAddPathClick,
  forceUpdate,
}: {
  title: string;
  storageType: StorateType;
  storage: StorageItem[];
  alreadyPaths: ActualPathState;
  onAddPathClick: (resourceType: ResourceType) => void;
  forceUpdate: () => void;
}) {
  return (
    <div>
      <h3>{title}:</h3>
      {alreadyPaths.size > 0 ? (
        [...alreadyPaths.entries()].map(([resourceType, resourcePaths]) => {
          const storageResource = storage.find(
            (item) => item.resourceType === resourceType,
          );

          return (
            <div key={resourceType}>
              <div className={styles.resourceNameLine}>
                <div className={styles.resourceName}>
                  {resourceLocalization[resourceType]}:{' '}
                  <span>{humanFormat(storageResource?.quantity ?? 0)}</span>
                </div>
                <button
                  type="button"
                  className={styles.addCarrierPathButton}
                  onClick={() => onAddPathClick(resourceType)}
                >
                  Add carrier path
                </button>
              </div>
              <div className={styles.carrierPaths}>
                {resourcePaths.map((resourcePath, i) => (
                  <label key={i} className={styles.carrierPathLine}>
                    {'Carriers: '}
                    <input
                      type="number"
                      value={resourcePath.inputValue}
                      onChange={(event) => {
                        resourcePath.inputValue = event.target.value;
                        resourcePath.changed = true;
                        forceUpdate();
                      }}
                    />
                    {storageType === StorateType.INPUT
                      ? ` from ${formatCell(resourcePath.path.path.from)}`
                      : ` to ${formatCell(resourcePath.path.path.to)}`}
                  </label>
                ))}
              </div>
            </div>
          );
        })
      ) : (
        <div>No entities</div>
      )}
    </div>
  );
}

function formatCell(cell: CellPosition): string {
  return `(${cell.i},${cell.j})`;
}
