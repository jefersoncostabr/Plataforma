(function () {
    const SLOT_IDS = Object.freeze(['slot1', 'slot2', 'slot3']);
    const BASE_SAVE_KEYS = Object.freeze([
        'plataformaInventario',
        'plataformaCheckpointEquipamento',
        'plataformaCraftPersistente',
        'plataformaSkills',
        'plataformaFaseAtual'
    ]);
    const GLOBAL_PROGRESS_KEYS = Object.freeze([
        'plataformaCaoResgatado',
        'plataformaGatoResgatado',
        'plataformaCaoNaBase',
        'plataformaGatoNaBase'
    ]);

    const ACTIVE_SLOT_KEY = 'plataformaSlotAtual';
    const MIGRATION_FLAG_KEY = 'plataformaSlotsMigracaoV1';
    const SLOT_DIFFICULTY_PREFIX = 'plataformaDificuldade_';
    const SLOT_DIFFICULTY_LOCK_PREFIX = 'plataformaDificuldadeTravada_';

    function isValidSlotId(slotId) {
        return SLOT_IDS.includes(String(slotId || '').toLowerCase());
    }

    function normalizeSlotId(slotId) {
        return isValidSlotId(slotId) ? String(slotId).toLowerCase() : 'slot1';
    }

    function isValidDifficulty(value) {
        const normalized = String(value || '').toLowerCase();
        return normalized === 'easy' || normalized === 'normal' || normalized === 'hard';
    }

    function normalizeDifficulty(value) {
        return isValidDifficulty(value) ? String(value).toLowerCase() : 'normal';
    }

    function safeGetItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    }

    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (_) {
            return false;
        }
    }

    function safeRemoveItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (_) {
            return false;
        }
    }

    function buildSlotKey(baseKey, slotId) {
        return `${String(baseKey || '').trim()}_${normalizeSlotId(slotId)}`;
    }

    function getActiveSlotId() {
        const saved = safeGetItem(ACTIVE_SLOT_KEY);
        return normalizeSlotId(saved);
    }

    function setActiveSlotId(slotId) {
        const normalized = normalizeSlotId(slotId);
        safeSetItem(ACTIVE_SLOT_KEY, normalized);
        window.slotAtualID = normalized;
        return normalized;
    }

    function getSlotDifficultyKey(slotId) {
        return SLOT_DIFFICULTY_PREFIX + normalizeSlotId(slotId);
    }

    function getSlotDifficulty(slotId) {
        return normalizeDifficulty(safeGetItem(getSlotDifficultyKey(slotId)));
    }

    function setSlotDifficulty(slotId, difficulty) {
        return safeSetItem(getSlotDifficultyKey(slotId), normalizeDifficulty(difficulty));
    }

    function getSlotDifficultyLockKey(slotId) {
        return SLOT_DIFFICULTY_LOCK_PREFIX + normalizeSlotId(slotId);
    }

    function isDifficultyLocked(slotId) {
        return safeGetItem(getSlotDifficultyLockKey(slotId)) === '1';
    }

    function lockDifficultyForSlot(slotId) {
        return safeSetItem(getSlotDifficultyLockKey(slotId), '1');
    }

    function isSlotOccupied(slotId) {
        const normalized = normalizeSlotId(slotId);

        if (safeGetItem(getSlotDifficultyKey(normalized))) {
            return true;
        }

        return BASE_SAVE_KEYS.some((baseKey) => !!safeGetItem(buildSlotKey(baseKey, normalized)));
    }

    function clearSlot(slotId) {
        const normalized = normalizeSlotId(slotId);

        BASE_SAVE_KEYS.forEach((baseKey) => {
            safeRemoveItem(buildSlotKey(baseKey, normalized));
        });

        safeRemoveItem(getSlotDifficultyKey(normalized));
        safeRemoveItem(getSlotDifficultyLockKey(normalized));
        return true;
    }

    function clearAllSaves() {
        SLOT_IDS.forEach(clearSlot);
        BASE_SAVE_KEYS.forEach(safeRemoveItem);
        GLOBAL_PROGRESS_KEYS.forEach(safeRemoveItem);
        safeRemoveItem(ACTIVE_SLOT_KEY);
        safeSetItem(ACTIVE_SLOT_KEY, 'slot1');
        safeSetItem(MIGRATION_FLAG_KEY, '1');
        window.slotAtualID = 'slot1';
        return true;
    }

    function migrateLegacyDataToSlot1() {
        if (safeGetItem(MIGRATION_FLAG_KEY) === '1') {
            return false;
        }

        const slotId = 'slot1';
        if (isSlotOccupied(slotId)) {
            safeSetItem(MIGRATION_FLAG_KEY, '1');
            return false;
        }

        let migrated = false;

        BASE_SAVE_KEYS.forEach((baseKey) => {
            const legacyRaw = safeGetItem(baseKey);
            if (!legacyRaw) return;

            const targetKey = buildSlotKey(baseKey, slotId);
            if (safeGetItem(targetKey)) return;

            if (safeSetItem(targetKey, legacyRaw)) {
                migrated = true;
            }
        });

        if (migrated) {
            if (!safeGetItem(getSlotDifficultyKey(slotId))) {
                setSlotDifficulty(slotId, 'normal');
            }
            lockDifficultyForSlot(slotId);
        }

        safeSetItem(MIGRATION_FLAG_KEY, '1');
        return migrated;
    }

    function init() {
        setActiveSlotId(getActiveSlotId());
        migrateLegacyDataToSlot1();
    }

    window.SaveSlots = {
        SLOT_IDS,
        BASE_SAVE_KEYS,
        isValidSlotId,
        normalizeSlotId,
        isValidDifficulty,
        normalizeDifficulty,
        getStorageKey: buildSlotKey,
        getActiveSlotId,
        setActiveSlotId,
        getSlotDifficulty,
        setSlotDifficulty,
        isDifficultyLocked,
        lockDifficultyForSlot,
        isSlotOccupied,
        clearSlot,
        clearAllSaves,
        migrateLegacyDataToSlot1,
        init
    };
})();
