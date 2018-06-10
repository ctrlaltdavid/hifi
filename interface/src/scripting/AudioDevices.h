//
//  AudioDevices.h
//  interface/src/scripting
//
//  Created by Zach Pomerantz on 28/5/2017.
//  Copyright 2017 High Fidelity, Inc.
//
//  Distributed under the Apache License, Version 2.0.
//  See the accompanying file LICENSE or http://www.apache.org/licenses/LICENSE-2.0.html
//

#ifndef hifi_scripting_AudioDevices_h
#define hifi_scripting_AudioDevices_h

#include <memory>
#include <mutex>

#include <QObject>
#include <QAbstractListModel>
#include <QAudioDeviceInfo>

namespace scripting {

class AudioDevice {
public:
    QAudioDeviceInfo info;
    QString display;
    bool selectedDesktop { false };
    bool selectedHMD { false };
};

/**jsdoc
 * @class AudioDevices.AudioOutputs
 */
class AudioDeviceList : public QAbstractListModel {
    Q_OBJECT

    // API items from QAbstractListModel

    /**jsdoc
     * @function AudioDevices.AudioOutputs.canFetchMore
     * @param {object} parent
     * @returns {boolean}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnCount
     * @param {object} [parent=null]
     * @returns {number}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsAboutToBeInserted
     * @param {object} parent
     * @param {number} first
     * @param {number} last
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsAboutToBeMoved
     * @param {object} sourceParent
     * @param {number} sourceStart
     * @param {number} sourceEnd
     * @param {object} destinationParent
     * @param {number} destinationColumn
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsAboutToBeRemoved
     * @param {object} parent
     * @param {number} first
     * @param {number} last
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsInserted
     * @param {object} parent
     * @param {number} first
     * @param {number} last
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsMoved
     * @param {object} sourceParent
     * @param {number} sourceStart
     * @param {number} sourceEnd
     * @param {object} destinationParent
     * @param {number} destinationColumn
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.columnsRemoved
     * @param {object} parent
     * @param {number} first
     * @param {number} last
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.data
     * @param {object} parent
     * @param {number} [role=0]
     * @returns {object}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.dataChanged
     * @param {object} topLeft
     * @param {object} bottomRight
     * @param {number[]} roles
     * @returns {Signal}
     */

    /**jsdoc
     * @function AudioDevices.AudioOutputs.deviceChanged(QAudioDeviceInfo) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.fetchMore(QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.flags(QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.hasChildren() function
hasChildren(QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.hasIndex(int, int) function
hasIndex(int, int, QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.headerData(int, Qt::Orientation) function
headerData(int, Qt::Orientation, int) function
headerDataChanged(Qt::Orientation, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.index(int, int) function
index(int, int, QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.layoutAboutToBeChanged() function
layoutAboutToBeChanged(QList<QPersistentModelIndex>) function
layoutAboutToBeChanged(QList<QPersistentModelIndex>, QAbstractItemModel::LayoutChangeHint) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.layoutChanged() function
layoutChanged(QList<QPersistentModelIndex>) function
layoutChanged(QList<QPersistentModelIndex>, QAbstractItemModel::LayoutChangeHint) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.match(QModelIndex, int, QVariant) function
match(QModelIndex, int, QVariant, int) function
match(QModelIndex, int, QVariant, int, Qt::MatchFlags) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.modelAboutToBeReset() function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.modelReset() function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.onDeviceChanged(QAudioDeviceInfo, bool) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.onDevicesChanged(QList<QAudioDeviceInfo>) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.parent(QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.resetInternalData() function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.revert() function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowCount() function
rowCount(QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsAboutToBeInserted(QModelIndex, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsAboutToBeMoved(QModelIndex, int, int, QModelIndex, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsAboutToBeRemoved(QModelIndex, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsInserted(QModelIndex, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsMoved(QModelIndex, int, int, QModelIndex, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsRemoved(QModelIndex, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowsRemoved(QModelIndex, int, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.selectedDevicePlugged(QAudioDeviceInfo, bool) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.setData(QModelIndex, QVariant) function
setData(QModelIndex, QVariant, int) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.sibling(int, int, QModelIndex) function

    /**jsdoc
     * @function AudioDevices.AudioOutputs.submit() function

     // TODO: Signals

public:
    AudioDeviceList(QAudio::Mode mode = QAudio::AudioOutput);
    virtual ~AudioDeviceList();

    virtual std::shared_ptr<AudioDevice> newDevice(const AudioDevice& device)
        { return std::make_shared<AudioDevice>(device); }

    /**jsdoc
     * @function AudioDevices.AudioOutputs.rowCount
     * @param {object} [parent=null]
     * @returns {number}
     */
    int rowCount(const QModelIndex& parent = QModelIndex()) const override { Q_UNUSED(parent); return _devices.size(); }

    // This function doesn't come through into API.
    QHash<int, QByteArray> roleNames() const override { return _roles; }

    /**jsdoc
     * @function AudioDevices.AudioOutputs.flags
     */
    Qt::ItemFlags flags(const QModelIndex& index) const override { return _flags; }

    /**jsdoc
     * @function AudioDevices.AudioOutputs.data
     */
    // get/set devices through a QML ListView
    QVariant data(const QModelIndex& index, int role) const override;

    // reset device to the last selected device in this context, or the default
    void resetDevice(bool contextIsHMD);

signals:
    void deviceChanged(const QAudioDeviceInfo& device);
    void selectedDevicePlugged(const QAudioDeviceInfo& device, bool isHMD);

protected slots:
    void onDeviceChanged(const QAudioDeviceInfo& device, bool isHMD);
    void onDevicesChanged(const QList<QAudioDeviceInfo>& devices);

protected:
    friend class AudioDevices;

    static QHash<int, QByteArray> _roles;
    static Qt::ItemFlags _flags;
    const QAudio::Mode _mode;
    QAudioDeviceInfo _selectedDesktopDevice;
    QAudioDeviceInfo _selectedHMDDevice;
    QString _backupSelectedDesktopDeviceName;
    QString _backupSelectedHMDDeviceName;
    QList<std::shared_ptr<AudioDevice>> _devices;
    QString _hmdSavedDeviceName;
    QString _desktopSavedDeviceName;
};

class AudioInputDevice : public AudioDevice {
public:
    AudioInputDevice(const AudioDevice& device) : AudioDevice(device) {}
    float peak { 0.0f };
};

/**jsdoc
 * @class AudioDevices.AudioInputs
 * @property {boolean} peakValuesAvailable <em>Read-only.</em>
 * @property {boolean} peakValuesEnabled
 *
 * @borrows AudioDevices.AudioOutputs.rowCount as rowCount
 */
class AudioInputDeviceList : public AudioDeviceList {
    Q_OBJECT
    Q_PROPERTY(bool peakValuesAvailable READ peakValuesAvailable)
    Q_PROPERTY(bool peakValuesEnabled READ peakValuesEnabled WRITE setPeakValuesEnabled NOTIFY peakValuesEnabledChanged)

public:
    AudioInputDeviceList() : AudioDeviceList(QAudio::AudioInput) {}
    virtual ~AudioInputDeviceList() = default;

    virtual std::shared_ptr<AudioDevice> newDevice(const AudioDevice& device) override
        { return std::make_shared<AudioInputDevice>(device); }

    QVariant data(const QModelIndex& index, int role) const override;

signals:

    /**jsdoc
     * @function AudioDevices.AudioInputs.peakValuesEnabledChanged
     * @param {boolean} enabled
     * @returns {Signal}
     */
    void peakValuesEnabledChanged(bool enabled);

protected slots:
    /**jsdoc
     * @function AudioDevices.AudioInputs.peakValuesEnabledChanged
     * @param {number[]} peakValueList
     * @deprecated TODO: Deprecate this signal?
     */
    void onPeakValueListChanged(const QList<float>& peakValueList);

protected:
    friend class AudioDevices;

    bool peakValuesAvailable();
    std::once_flag _peakFlag;
    bool _peakValuesAvailable;

    bool peakValuesEnabled() const { return _peakValuesEnabled; }
    void setPeakValuesEnabled(bool enable);
    bool _peakValuesEnabled { false };
};
class Audio;

/**jsdoc
 * @class AudioDevices
 * @property {AudioDevices.AudioInputs} input <em>Read-only.</em>
 * @property {AudioDevices.AudioOutputs} output <em>Read-only.</em>
 */

class AudioDevices : public QObject {
    Q_OBJECT
    Q_PROPERTY(AudioInputDeviceList* input READ getInputList NOTIFY nop)
    Q_PROPERTY(AudioDeviceList* output READ getOutputList NOTIFY nop)

public:
    AudioDevices(bool& contextIsHMD);
    virtual ~AudioDevices();

signals:

    /**jsdoc
     * @function AudioDevices.nop
     * @returns {Signal}
     */
    void nop();

private slots:
    void chooseInputDevice(const QAudioDeviceInfo& device, bool isHMD);
    void chooseOutputDevice(const QAudioDeviceInfo& device, bool isHMD);

    void onContextChanged(const QString& context);
    void onDeviceSelected(QAudio::Mode mode, const QAudioDeviceInfo& device,
                          const QAudioDeviceInfo& previousDevice, bool isHMD);
    void onDeviceChanged(QAudio::Mode mode, const QAudioDeviceInfo& device);
    void onDevicesChanged(QAudio::Mode mode, const QList<QAudioDeviceInfo>& devices);

private:
    friend class Audio;

    AudioInputDeviceList* getInputList() { return &_inputs; }
    AudioDeviceList* getOutputList() { return &_outputs; }

    AudioInputDeviceList _inputs;
    AudioDeviceList _outputs { QAudio::AudioOutput };
    QAudioDeviceInfo _requestedOutputDevice;
    QAudioDeviceInfo _requestedInputDevice;

    const bool& _contextIsHMD;
};

};

#endif // hifi_scripting_AudioDevices_h
